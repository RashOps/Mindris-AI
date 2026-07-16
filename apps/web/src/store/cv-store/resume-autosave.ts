import { normalizeResumeDocument, nowIso } from "./resume-normalizers";
import type { CVStore } from "./store-types";
import type { ResumeDocument } from "./types";
import { persistResume } from "./store-api";

const RESUME_SAVE_DEBOUNCE_MS = 900;

type PendingResumeSave = {
  resumeId: string;
  patch: Partial<ResumeDocument>;
  revision: number;
};

type StoreStatePatch = Partial<CVStore> | ((state: CVStore) => Partial<CVStore>);

let resumeSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingResumeSave: PendingResumeSave | null = null;
let lastFailedResumeSave: PendingResumeSave | null = null;
let resumeSaveRevision = 0;
let setStoreState: ((patch: StoreStatePatch) => void) | null = null;

export function configureResumeAutosave(
  setter: (patch: StoreStatePatch) => void,
) {
  setStoreState = setter;
}

function updateStore(patch: StoreStatePatch) {
  if (!setStoreState) {
    throw new Error("Resume autosave is not configured.");
  }
  setStoreState(patch);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Resume save failed";
}

export function schedulePersistResume(
  resumeId: string,
  patch: Partial<ResumeDocument>,
) {
  resumeSaveRevision += 1;
  pendingResumeSave = {
    resumeId,
    patch,
    revision: resumeSaveRevision,
  };
  lastFailedResumeSave = null;
  if (resumeSaveTimer) clearTimeout(resumeSaveTimer);
  updateStore({
    resumeSaveStatus: "dirty",
    resumeSaveError: null,
  });
  resumeSaveTimer = setTimeout(() => {
    void flushPendingResumeSave();
  }, RESUME_SAVE_DEBOUNCE_MS);
}

async function saveResumeSnapshot(snapshot: PendingResumeSave) {
  updateStore({
    resumeSaveStatus: "saving",
    resumeSaveError: null,
  });
  try {
    const data = await persistResume(snapshot.resumeId, snapshot.patch);
    if (snapshot.revision === resumeSaveRevision) {
      updateStore((state) => ({
        resumes: state.resumes.map((resume) =>
          resume.id === data.item.id
            ? normalizeResumeDocument(data.item)
            : resume,
        ),
        cvData:
          state.activeResumeId === data.item.id
            ? normalizeResumeDocument(data.item).cvData
            : state.cvData,
        resumeSaveStatus: "saved",
        resumeSaveError: null,
        lastResumeSavedAt: nowIso(),
      }));
    }
  } catch (error: unknown) {
    lastFailedResumeSave = snapshot;
    if (snapshot.revision === resumeSaveRevision) {
      updateStore({
        resumeSaveStatus: "error",
        resumeSaveError: errorMessage(error),
      });
    }
  }
}

export async function flushPendingResumeSave() {
  if (resumeSaveTimer) {
    clearTimeout(resumeSaveTimer);
    resumeSaveTimer = null;
  }
  const snapshot = pendingResumeSave;
  pendingResumeSave = null;
  if (!snapshot) return;
  await saveResumeSnapshot(snapshot);
}

export async function retryLastResumeSave() {
  if (pendingResumeSave) {
    await flushPendingResumeSave();
    return;
  }
  if (!lastFailedResumeSave) return;
  resumeSaveRevision += 1;
  const snapshot = {
    ...lastFailedResumeSave,
    revision: resumeSaveRevision,
  };
  lastFailedResumeSave = null;
  await saveResumeSnapshot(snapshot);
}
