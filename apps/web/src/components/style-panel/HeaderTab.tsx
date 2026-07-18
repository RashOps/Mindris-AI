import type { GlobalSettings } from "@/store/useCVStore";

import { PANEL_TOGGLE_CLASS } from "./constants";
import { SectionLabel } from "./controls";
import { AlignmentPreview, VisualOptionGroup } from "./visual-controls";

type LayoutSettings = NonNullable<GlobalSettings["layout"]>;
type LinkSettings = NonNullable<GlobalSettings["links"]>;

const ARRANGEMENT_LABELS: Record<string, string> = {
  inline: "En ligne",
  grid: "En grille",
  bullet: "Avec puces",
  bar: "Séparateurs",
  icons: "Icônes",
};

const ICON_LABELS: Record<string, string> = {
  none: "Sans icône",
  outline: "Contour",
  filled: "Pleine",
};

export function HeaderTab({
  settings,
  alignments,
  positions,
  arrangements,
  iconStyles,
  update,
}: {
  settings: LayoutSettings;
  alignments: string[];
  positions: string[];
  arrangements: string[];
  iconStyles: string[];
  update: (patch: Partial<LayoutSettings>) => void;
}) {
  return (
    <>
      <section>
        <SectionLabel>Texte de l’en-tête</SectionLabel>
        <VisualOptionGroup
          label="Position"
          value={settings.header_position ?? "top"}
          options={positions.map((position) => ({
            value: position,
            label:
              position === "top"
                ? "En haut"
                : position === "left"
                  ? "À gauche"
                  : "À droite",
          }))}
          onChange={(header_position) =>
            update({
              header_position:
                header_position as LayoutSettings["header_position"],
            })
          }
        />
        <div className="mt-4">
        <VisualOptionGroup
          label="Alignement"
          value={settings.header_alignment ?? "left"}
          options={alignments.map((alignment) => ({
            value: alignment,
            label:
              alignment === "left"
                ? "Gauche"
                : alignment === "right"
                  ? "Droite"
                  : "Centré",
            preview: (
              <AlignmentPreview
                value={alignment as "left" | "center" | "right"}
              />
            ),
          }))}
          onChange={(header_alignment) =>
            update({
              header_alignment: header_alignment as LayoutSettings["header_alignment"],
            })
          }
        />
        </div>
      </section>
      <section>
        <SectionLabel>Coordonnées</SectionLabel>
        <VisualOptionGroup
          label="Organisation"
          value={settings.header_details_arrangement ?? "inline"}
          options={arrangements.map((arrangement) => ({
            value: arrangement,
            label: ARRANGEMENT_LABELS[arrangement] ?? arrangement,
          }))}
          onChange={(header_details_arrangement) =>
            update({
              header_details_arrangement:
                header_details_arrangement as LayoutSettings["header_details_arrangement"],
            })
          }
          columns={2}
        />
      </section>
      <VisualOptionGroup
        label="Style des icônes"
        value={settings.header_icon_style ?? "outline"}
        options={iconStyles.map((style) => ({
          value: style,
          label: ICON_LABELS[style] ?? style,
        }))}
        onChange={(header_icon_style) =>
          update({
            header_icon_style:
              header_icon_style as LayoutSettings["header_icon_style"],
          })
        }
      />
    </>
  );
}

export function LinksTab({
  settings,
  colors,
  update,
}: {
  settings: LinkSettings;
  colors: string[];
  update: (patch: Partial<LinkSettings>) => void;
}) {
  const colorLabels: Record<string, string> = {
    accent: "Couleur principale",
    blue: "Bleu classique",
    inherit: "Comme le texte",
  };
  return (
    <>
      <section>
        <SectionLabel>Apparence des liens</SectionLabel>
        <VisualOptionGroup
          label="Couleur"
          value={settings.color ?? "accent"}
          options={colors.map((color) => ({
            value: color,
            label: colorLabels[color] ?? color,
          }))}
          onChange={(color) => update({ color: color as LinkSettings["color"] })}
        />
      </section>
      <label className={PANEL_TOGGLE_CLASS}>
        <span className="text-xs font-medium text-foreground">Souligner les liens</span>
        <input
          type="checkbox"
          checked={settings.underline ?? false}
          onChange={(event) => update({ underline: event.target.checked })}
        />
      </label>
      <label className={PANEL_TOGGLE_CLASS}>
        <span className="text-xs font-medium text-foreground">Afficher ↗</span>
        <input
          type="checkbox"
          checked={settings.show_icon ?? false}
          onChange={(event) => update({ show_icon: event.target.checked })}
        />
      </label>
    </>
  );
}
