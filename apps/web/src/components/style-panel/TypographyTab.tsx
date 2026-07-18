import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { resolveCustomizationOptionLists } from "@/lib/customization-catalogue";
import type { GlobalSettings } from "@/store/useCVStore";

import { DEFAULT_FONT, PANEL_INPUT_CLASS, PANEL_TOGGLE_CLASS } from "./constants";
import { SectionLabel } from "./controls";
import { SteppedSlider } from "./visual-controls";

type Options = ReturnType<typeof resolveCustomizationOptionLists>;
type Typography = NonNullable<GlobalSettings["typography"]>;

export function TypographyTab({
  settings,
  typography,
  options,
  update,
}: {
  settings: GlobalSettings;
  typography: Typography;
  options: Options;
  update: (patch: Partial<GlobalSettings>) => void;
}) {
  const updateTypography = (patch: Partial<Typography>) =>
    update({ typography: { ...typography, ...patch } });

  const sizeControl = (
    label: string,
    range: { min: number; max: number },
    value: string | undefined,
    fallback: string,
    key: keyof Typography,
  ) => (
    <SteppedSlider
      label={label}
      min={range.min}
      max={range.max}
      value={parseInt(value ?? fallback, 10)}
      unit="px"
      onChange={(next) => updateTypography({ [key]: `${next}px` })}
    />
  );

  return (
    <>
      <section>
        <SectionLabel>Polices</SectionLabel>
        <div className="space-y-3">
          <ToolbarSelect
            value={typography.body_font ?? DEFAULT_FONT}
            ariaLabel="Police du texte"
            options={options.fonts.map((font) => ({ value: font, label: font }))}
            onChange={(body_font) =>
              update({
                font_family: body_font,
                typography: { ...typography, body_font },
              })
            }
            triggerClassName={PANEL_INPUT_CLASS + " w-full"}
            menuClassName="min-w-64"
          />
          <ToolbarSelect
            value={typography.heading_font ?? DEFAULT_FONT}
            ariaLabel="Police des titres"
            options={options.headingFonts.map((font) => ({ value: font, label: font }))}
            onChange={(heading_font) => updateTypography({ heading_font })}
            triggerClassName={PANEL_INPUT_CLASS + " w-full"}
            menuClassName="min-w-64"
          />
        </div>
      </section>

      <section className="space-y-2">
        <SectionLabel>Tailles</SectionLabel>
        <SteppedSlider
          label="Taille du texte"
          min={options.bodySize.min}
          max={options.bodySize.max}
          value={parseInt(
            typography.body_size ?? typography.base_size ?? settings.font_size ?? "13",
            10,
          )}
          unit="px"
          onChange={(next) =>
            update({
              font_size: `${next}px`,
              typography: {
                ...typography,
                base_size: `${next}px`,
                body_size: `${next}px`,
              },
            })
          }
        />
        {sizeControl("Nom", options.nameSize, typography.name_size, "28", "name_size")}
        {sizeControl(
          "Titre professionnel",
          options.titleSize,
          typography.title_size,
          "15",
          "title_size",
        )}
        {sizeControl(
          "Titres des sections",
          options.sectionHeadingSize,
          typography.section_heading_size,
          "10",
          "section_heading_size",
        )}
        {sizeControl(
          "Titres des entrées",
          options.entryHeadingSize,
          typography.entry_heading_size,
          "14",
          "entry_heading_size",
        )}
      </section>

      <section>
        <SectionLabel>Présentation</SectionLabel>
        <div className="grid gap-2">
          <ToolbarSelect
            value={typography.weight ?? "regular"}
            ariaLabel="Graisse du texte"
            options={options.weights.map((weight) => ({ value: weight, label: weight }))}
            onChange={(weight) =>
              updateTypography({ weight: weight as Typography["weight"] })
            }
            triggerClassName={PANEL_INPUT_CLASS}
          />
          <label className={PANEL_TOGGLE_CLASS}>
            <span className="text-xs font-medium text-foreground">
              Titres en majuscules
            </span>
            <input
              type="checkbox"
              checked={typography.titles_uppercase ?? true}
              onChange={(event) =>
                updateTypography({ titles_uppercase: event.target.checked })
              }
            />
          </label>
          <ToolbarSelect
            value={typography.line_height ?? settings.line_height ?? "1.5"}
            ariaLabel="Hauteur de ligne"
            options={options.lineHeights.map((value) => ({ value, label: value }))}
            onChange={(line_height) =>
              update({
                line_height,
                typography: { ...typography, line_height },
              })
            }
            triggerClassName={PANEL_INPUT_CLASS}
          />
          <ToolbarSelect
            value={typography.date_style ?? "normal"}
            ariaLabel="Style des dates"
            options={options.dateStyles.map((value) => ({ value, label: value }))}
            onChange={(date_style) =>
              updateTypography({ date_style: date_style as Typography["date_style"] })
            }
            triggerClassName={PANEL_INPUT_CLASS}
          />
          <ToolbarSelect
            value={typography.bullet_style ?? "bullets"}
            ariaLabel="Style des listes"
            options={options.bulletStyles.map((value) => ({ value, label: value }))}
            onChange={(bullet_style) =>
              updateTypography({
                bullet_style: bullet_style as Typography["bullet_style"],
              })
            }
            triggerClassName={PANEL_INPUT_CLASS}
          />
        </div>
      </section>
    </>
  );
}
