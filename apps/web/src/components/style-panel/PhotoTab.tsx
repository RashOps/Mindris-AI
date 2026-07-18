"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { apiHeaders, apiUrl } from "@/lib/api";
import type { CustomizationCatalogue } from "@/lib/customization-catalogue";
import type { GlobalSettings, Profile } from "@/store/useCVStore";

import { PANEL_TOGGLE_CLASS } from "./constants";
import { SectionLabel } from "./controls";
import { VisualOptionGroup } from "./visual-controls";

type PhotoSettings = NonNullable<NonNullable<GlobalSettings["layout"]>["photo"]>;

const POSITION_LABELS: Record<string, string> = {
  left: "À gauche",
  top: "Au-dessus",
  right: "À droite",
};

const SHAPE_LABELS: Record<string, string> = {
  round: "Ronde",
  square: "Carrée",
  rounded: "Arrondie",
  portrait: "Portrait",
};

export function PhotoTab({
  profile,
  settings,
  options,
  updateProfile,
  updateSettings,
}: {
  profile: Profile;
  settings: PhotoSettings;
  options: CustomizationCatalogue["layout"]["photo"];
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<PhotoSettings>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(apiUrl("/api/v1/cv/photo"), {
        method: "POST",
        headers: apiHeaders(),
        body: form,
      });
      const payload = (await response.json()) as {
        photo_url?: string;
        message?: string;
      };
      if (!response.ok || !payload.photo_url) {
        throw new Error(payload.message ?? "Import impossible");
      }
      updateProfile({ photo_url: payload.photo_url });
      updateSettings({ enabled: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import impossible");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <section>
        <SectionLabel>Photo de profil</SectionLabel>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background text-xs text-muted-foreground">
              {profile.photo_url ? (
                <Image
                  src={profile.photo_url}
                  alt="Aperçu de la photo de profil"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                "Aucune"
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
              >
                {uploading
                  ? "Import en cours…"
                  : profile.photo_url
                    ? "Remplacer la photo"
                    : "Ajouter une photo"}
              </button>
              {profile.photo_url ? (
                <button
                  type="button"
                  onClick={() => {
                    updateProfile({ photo_url: null });
                    updateSettings({ enabled: false });
                  }}
                  className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  Supprimer
                </button>
              ) : null}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          <p className="mt-2 text-[10px] text-muted-foreground">
            PNG, JPEG ou WebP, 2 Mo maximum. La photo est validée et stockée par le backend.
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {profile.photo_url ? (
        <>
          <section>
            <label className={PANEL_TOGGLE_CLASS}>
              <span className="text-xs font-medium text-foreground">
                Afficher la photo
              </span>
              <input
                type="checkbox"
                checked={settings.enabled ?? false}
                onChange={(event) => updateSettings({ enabled: event.target.checked })}
              />
            </label>
            <label className={PANEL_TOGGLE_CLASS + " mt-2"}>
              <span className="text-xs font-medium text-foreground">
                Noir et blanc
              </span>
              <input
                type="checkbox"
                checked={settings.grayscale ?? false}
                onChange={(event) => updateSettings({ grayscale: event.target.checked })}
              />
            </label>
          </section>

          <VisualOptionGroup
            label="Position"
            value={settings.position ?? "left"}
            options={options.positions.map((position) => ({
              value: position,
              label: POSITION_LABELS[position] ?? position,
            }))}
            onChange={(position) =>
              updateSettings({ position: position as PhotoSettings["position"] })
            }
          />
          <VisualOptionGroup
            label="Forme"
            value={settings.shape ?? "round"}
            options={options.shapes.map((shape) => ({
              value: shape,
              label: SHAPE_LABELS[shape] ?? shape,
            }))}
            onChange={(shape) =>
              updateSettings({ shape: shape as PhotoSettings["shape"] })
            }
            columns={2}
          />
          <VisualOptionGroup
            label="Taille"
            value={settings.size ?? "m"}
            options={options.sizes.map((size) => ({
              value: size,
              label: size.toUpperCase(),
            }))}
            onChange={(size) =>
              updateSettings({ size: size as PhotoSettings["size"] })
            }
          />
        </>
      ) : null}
    </>
  );
}
