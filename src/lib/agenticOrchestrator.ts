import type { CaseProfile } from "./caseProfileTypes";
import { emptyProfile } from "./caseProfileTypes";
import { extractCaseProfile, computeProfileConfidence } from "./caseProfileUtils";
import {
    generateAgenticFollowup,
    getTargetedQuestion,
    patchProfileFromAnswer,
    summarizePatch,
} from "./agenticCopilot";

// ─── Types ─────────────────────────────────────────────────────────────────

export type OrchestratorPhase =
    | "greeting"
    | "extracting"
    | "patching"
    | "questioning"
    | "ready";

export type MessageType =
    | "text"
    | "file_attach"
    | "thinking"
    | "confidence_update"
    | "field_patch"
    | "cta";

export interface OrchestratorMessage {
    id: string;
    role: "assistant" | "user";
    type: MessageType;
    content: string;
    /** Files attached by the user */
    files?: Array<{ name: string; type: string; preview?: string }>;
    /** Which fields were patched in this turn */
    patchedFields?: string[];
    /** Confidence score to display inline */
    confidence?: number;
}

export interface OrchestratorState {
    profile: CaseProfile;
    phase: OrchestratorPhase;
    messages: OrchestratorMessage[];
    /** The field label we are currently questioning about */
    currentQuestion: string | null;
    readyToProceed: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const READY_THRESHOLD = 60; // confidence % to show proceed CTA

// ─── Helpers ───────────────────────────────────────────────────────────────

let _msgId = 0;
function msgId(): string {
    return `msg-${Date.now()}-${++_msgId}`;
}

function assistantMsg(content: string, type: MessageType = "text", extra?: Partial<OrchestratorMessage>): OrchestratorMessage {
    return { id: msgId(), role: "assistant", type, content, ...extra };
}

function thinkingMsg(content: string): OrchestratorMessage {
    return { id: msgId(), role: "assistant", type: "thinking", content };
}

// ─── Initial State ─────────────────────────────────────────────────────────

export function createInitialState(): OrchestratorState {
    return {
        profile: emptyProfile(),
        phase: "greeting",
        messages: [
            assistantMsg(
                "Clinical Copilot online. I'll guide you through building a complete case profile.\n\nDrop imaging studies (DICOM, JPG, PNG) or documents (PDF, DOCX, TXT) directly into the chat, or paste a clinical note. I'll extract, structure, and ask follow-up questions until the profile is ready for routing.",
            ),
        ],
        currentQuestion: null,
        readyToProceed: false,
    };
}

// ─── Core Orchestration ────────────────────────────────────────────────────

export interface ProcessTurnInput {
    userText: string;
    files: File[];
    currentState: OrchestratorState;
}

export interface ProcessTurnOutput {
    newState: OrchestratorState;
}

export async function processIntakeTurn(input: ProcessTurnInput): Promise<ProcessTurnOutput> {
    const { userText, files, currentState } = input;
    const { profile: prevProfile } = currentState;

    const outgoingMessages: OrchestratorMessage[] = [];

    // 1. Build the user message
    const userMessage: OrchestratorMessage = {
        id: msgId(),
        role: "user",
        type: files.length > 0 && !userText.trim() ? "file_attach" : "text",
        content: userText.trim(),
        files: files.map(f => ({
            name: f.name,
            type: f.type,
            preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
        })),
    };
    outgoingMessages.push(userMessage);

    // Capture local image URL for the first uploaded image
    const firstImageFile = files.find(f => f.type.startsWith("image/") || f.name.endsWith(".dcm"));
    const localImageUrl = firstImageFile ? URL.createObjectURL(firstImageFile) : null;

    // ── Path A: Files or substantive text → run full extraction ──────────
    if (files.length > 0 || userText.trim().length > 30) {
        // Run extraction (thinking stages are handled by the panel)
        const images = files.filter(f => f.type.startsWith("image/") || f.name.endsWith(".dcm"));
        const docs = files.filter(f => !f.type.startsWith("image/") && !f.name.endsWith(".dcm"));
        const notesFile = docs[0] ?? null;

        let newProfile: CaseProfile;
        try {
            newProfile = await extractCaseProfile(images, userText, notesFile);
        } catch {
            newProfile = prevProfile; // keep what we had
        }

        // Merge with existing profile (keep already-captured fields)
        let mergedProfile = mergeProfiles(prevProfile, newProfile);
        // Inject local image URL if an image was uploaded
        if (localImageUrl && !mergedProfile.study.image_url) {
            mergedProfile = { ...mergedProfile, study: { ...mergedProfile.study, image_url: localImageUrl } };
        }

        const conf = computeProfileConfidence(mergedProfile);
        const patchedFields = diffProfileFields(prevProfile, mergedProfile);

        // Build assistant response
        const followup = generateAgenticFollowup(mergedProfile, conf.score);
        const patchSummary = patchedFields.length > 0
            ? summarizePatch(patchedFields)
            : null;

        const assistantContent = [
            patchSummary,
            followup.message,
        ].filter(Boolean).join("\n\n");

        const confMsg: OrchestratorMessage = {
            id: msgId(),
            role: "assistant",
            type: "confidence_update",
            content: `Profile completeness: ${conf.score}%`,
            confidence: conf.score,
        };

        const assistantReply = assistantMsg(assistantContent);

        const allMessages = [
            ...outgoingMessages,
            patchedFields.length > 0
                ? { id: msgId(), role: "assistant" as const, type: "field_patch" as MessageType, content: "", patchedFields }
                : null,
            confMsg,
            assistantReply,
        ].filter(Boolean) as OrchestratorMessage[];

        const nextQuestion = followup.priority_fields[0] ?? null;

        // Show proceed CTA if ready
        let ctaMessage: OrchestratorMessage | null = null;
        if (conf.score >= READY_THRESHOLD) {
            ctaMessage = assistantMsg(
                "The profile is comprehensive. You can proceed to find case matches.",
                "cta",
                { confidence: conf.score }
            );
            allMessages.push(ctaMessage);
        }

        const newState: OrchestratorState = {
            profile: mergedProfile,
            phase: conf.score >= READY_THRESHOLD ? "ready" : "questioning",
            messages: [...currentState.messages, ...allMessages],
            currentQuestion: nextQuestion,
            readyToProceed: conf.score >= READY_THRESHOLD,
        };

        return { newState };
    }

    // ── Path B: Short text answer to a follow-up question ─────────────────
    if (userText.trim().length > 0 && currentState.currentQuestion) {
        const thinkingPatch = thinkingMsg("Updating case profile…");

        const patched = patchProfileFromAnswer(
            currentState.currentQuestion,
            userText.trim(),
            prevProfile
        );

        const conf = computeProfileConfidence(patched);
        const patchedFields = diffProfileFields(prevProfile, patched);

        const followup = generateAgenticFollowup(patched, conf.score);

        const allMessages: OrchestratorMessage[] = [
            userMessage,
            thinkingPatch,
            patchedFields.length > 0
                ? { id: msgId(), role: "assistant" as const, type: "field_patch" as MessageType, content: "", patchedFields }
                : null,
            {
                id: msgId(),
                role: "assistant",
                type: "confidence_update",
                content: `Profile completeness: ${conf.score}%`,
                confidence: conf.score,
            },
            assistantMsg(followup.message),
        ].filter(Boolean) as OrchestratorMessage[];

        if (conf.score >= READY_THRESHOLD) {
            allMessages.push(assistantMsg(
                "The profile is comprehensive. You can proceed to find case matches.",
                "cta",
                { confidence: conf.score }
            ));
        }

        return {
            newState: {
                profile: patched,
                phase: conf.score >= READY_THRESHOLD ? "ready" : "questioning",
                messages: [...currentState.messages, ...allMessages],
                currentQuestion: followup.priority_fields[0] ?? null,
                readyToProceed: conf.score >= READY_THRESHOLD,
            }
        };
    }

    // ── Path C: Short text, no active question — generic nudge ────────────
    const nudge = assistantMsg(
        "Got it! To build up the case profile, try sharing clinical notes (at least a few sentences) or upload an imaging study."
    );

    return {
        newState: {
            ...currentState,
            messages: [...currentState.messages, userMessage, nudge],
        }
    };
}

// ─── Profile Diff ──────────────────────────────────────────────────────────

/** Returns human-readable labels for fields that changed between two profiles */
function diffProfileFields(prev: CaseProfile, next: CaseProfile): string[] {
    const changed: string[] = [];

    const check = (label: string, a: unknown, b: unknown) => {
        const isEmpty = (v: unknown) =>
            v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        if (isEmpty(a) && !isEmpty(b)) changed.push(label);
        else if (!isEmpty(a) && !isEmpty(b) && JSON.stringify(a) !== JSON.stringify(b)) {
            changed.push(label);
        }
    };

    check("Age", prev.patient.age_years, next.patient.age_years);
    check("Sex", prev.patient.sex, next.patient.sex);
    check("Comorbidities", prev.patient.comorbidities, next.patient.comorbidities);
    check("Allergies", prev.patient.allergies, next.patient.allergies);
    check("Medications", prev.patient.medications, next.patient.medications);
    check("Chief complaint", prev.presentation.chief_complaint, next.presentation.chief_complaint);
    check("HPI", prev.presentation.hpi, next.presentation.hpi);
    check("PMH", prev.presentation.pmh, next.presentation.pmh);
    check("Symptom duration", prev.presentation.symptom_duration, next.presentation.symptom_duration);
    check("Imaging modality", prev.study.modality, next.study.modality);
    check("Body region", prev.study.body_region, next.study.body_region);
    check("View position", prev.study.view_position, next.study.view_position);
    check("Primary diagnosis", prev.assessment.diagnosis_primary, next.assessment.diagnosis_primary);
    check("Urgency", prev.assessment.urgency, next.assessment.urgency);
    check("Differential", prev.assessment.differential, next.assessment.differential);
    check("Summary", prev.summary.one_liner, next.summary.one_liner);

    return changed;
}

// ─── Profile Merge ─────────────────────────────────────────────────────────

/** Merge two profiles: keep truthy values, prefer `next` for filled fields */
export function mergeProfiles(base: CaseProfile, next: CaseProfile): CaseProfile {
    const pick = <T>(a: T, b: T): T => {
        const isEmpty = (v: unknown) =>
            v === null || v === undefined || v === "" || (Array.isArray(v) && (v as unknown[]).length === 0);
        return isEmpty(b) ? a : b;
    };

    return {
        ...next,
        profile_id: next.profile_id || base.profile_id,
        case_id: next.case_id || base.case_id,
        image_id: next.image_id || base.image_id,
        patient: {
            age_years: pick(base.patient.age_years, next.patient.age_years),
            sex: pick(base.patient.sex, next.patient.sex),
            immunocompromised: pick(base.patient.immunocompromised, next.patient.immunocompromised),
            weight_kg: pick(base.patient.weight_kg, next.patient.weight_kg),
            comorbidities: pick(base.patient.comorbidities, next.patient.comorbidities),
            medications: pick(base.patient.medications, next.patient.medications),
            allergies: pick(base.patient.allergies, next.patient.allergies),
        },
        presentation: {
            chief_complaint: pick(base.presentation.chief_complaint, next.presentation.chief_complaint),
            symptom_duration: pick(base.presentation.symptom_duration, next.presentation.symptom_duration),
            hpi: pick(base.presentation.hpi, next.presentation.hpi),
            pmh: pick(base.presentation.pmh, next.presentation.pmh),
        },
        study: {
            modality: pick(base.study.modality, next.study.modality),
            body_region: pick(base.study.body_region, next.study.body_region),
            view_position: pick(base.study.view_position, next.study.view_position),
            radiology_region: pick(base.study.radiology_region, next.study.radiology_region),
            caption: pick(base.study.caption, next.study.caption),
            image_type: pick(base.study.image_type, next.study.image_type),
            image_subtype: pick(base.study.image_subtype, next.study.image_subtype),
            image_url: pick(base.study.image_url, next.study.image_url),
            storage_path: pick(base.study.storage_path, next.study.storage_path),
        },
        assessment: {
            diagnosis_primary: pick(base.assessment.diagnosis_primary, next.assessment.diagnosis_primary),
            suspected_primary: pick(base.assessment.suspected_primary, next.assessment.suspected_primary),
            differential: pick(base.assessment.differential, next.assessment.differential),
            urgency: pick(base.assessment.urgency, next.assessment.urgency),
            infectious_concern: pick(base.assessment.infectious_concern, next.assessment.infectious_concern),
            icu_candidate: pick(base.assessment.icu_candidate, next.assessment.icu_candidate),
        },
        summary: {
            one_liner: pick(base.summary.one_liner, next.summary.one_liner),
            key_points: pick(base.summary.key_points, next.summary.key_points),
            red_flags: pick(base.summary.red_flags, next.summary.red_flags),
        },
    };
}

// ─── Utility ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
