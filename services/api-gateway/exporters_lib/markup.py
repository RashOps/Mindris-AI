"""LaTeX and Typst resume exporters."""

from database.records import ResumeRecord
from utils.logger import get_logger

from .markdown import resume_to_markdown

logger = get_logger(__name__, service_name="api-gateway")


def resume_to_latex(record: ResumeRecord) -> str:
    """Render a persisted resume as a compile-ready LaTeX document."""
    logger.info("Rendering resume %s to LaTeX", record.id)
    rendered = _markdown_to_latex(resume_to_markdown(record))
    logger.debug("Rendered LaTeX resume %s (%d chars)", record.id, len(rendered))
    return rendered


def resume_to_typst(record: ResumeRecord) -> str:
    """Render a persisted resume as a compile-ready Typst document."""
    logger.info("Rendering resume %s to Typst", record.id)
    rendered = _markdown_to_typst(resume_to_markdown(record))
    logger.debug("Rendered Typst resume %s (%d chars)", record.id, len(rendered))
    return rendered


def _markdown_to_latex(markdown: str) -> str:
    lines = [
        r"\documentclass[11pt]{article}",
        r"\usepackage[margin=1in]{geometry}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage{enumitem}",
        r"\usepackage[hidelinks]{hyperref}",
        r"\setlength{\parindent}{0pt}",
        r"\setlength{\parskip}{0.35em}",
        r"\begin{document}",
    ]
    in_list = False
    seen_title = False
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            lines.append("")
            continue

        if line.startswith("# "):
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            title = _latex_escape(_strip_markdown_formatting(line[2:]))
            if not seen_title:
                lines.extend(
                    [r"\begin{center}", rf"{{\LARGE {title}}}", r"\end{center}"]
                )
                seen_title = True
            else:
                lines.append(rf"\section*{{{title}}}")
            continue

        if line.startswith("## "):
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            lines.append(
                rf"\section*{{{_latex_escape(_strip_markdown_formatting(line[3:]))}}}"
            )
            continue

        if line.startswith("### "):
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            lines.append(
                rf"\subsection*{{{_latex_escape(_strip_markdown_formatting(line[4:]))}}}"
            )
            continue

        if line.startswith("- "):
            if not in_list:
                lines.append(r"\begin{itemize}[leftmargin=*]")
                in_list = True
            lines.append(
                rf"\item {_latex_escape(_strip_markdown_formatting(line[2:]))}"
            )
            continue

        if in_list:
            lines.append(r"\end{itemize}")
            in_list = False
        lines.append(_latex_escape(_strip_markdown_formatting(line)))

    if in_list:
        lines.append(r"\end{itemize}")
    lines.append(r"\end{document}")
    return "\n".join(lines).strip() + "\n"


def _markdown_to_typst(markdown: str) -> str:
    lines = [
        "#set page(margin: 1in)",
        '#set text(font: "Liberation Serif", size: 11pt)',
        "",
    ]
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue

        if line.startswith("# "):
            lines.append(f"= {_typst_escape(_strip_markdown_formatting(line[2:]))}")
            continue
        if line.startswith("## "):
            lines.append(f"== {_typst_escape(_strip_markdown_formatting(line[3:]))}")
            continue
        if line.startswith("### "):
            lines.append(f"=== {_typst_escape(_strip_markdown_formatting(line[4:]))}")
            continue

        lines.append(_typst_escape(_strip_markdown_formatting(line)))
    return "\n".join(lines).strip() + "\n"


def _strip_markdown_formatting(value: str) -> str:
    return value.replace("**", "").replace("*", "")


def _latex_escape(value: str) -> str:
    token = "__MINDRIS_LATEX_BACKSLASH__"
    escaped = value.replace("\\", token)
    replacements = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    for source, target in replacements.items():
        escaped = escaped.replace(source, target)
    return escaped.replace(token, r"\textbackslash{}")


def _typst_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("#", r"\#")
