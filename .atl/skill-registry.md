# Skill Registry

**Project**: web_horarios
**Last Updated**: 2026-05-21
**Source**: Built from installed skills in `/home/josue/.config/opencode/skills/` and `/home/josue/.agents/skills/`
**Contract**: This is an index, not a compiler. `SKILL.md` is the source of truth. Delegators select matching rows and pass exact paths to sub-agents.

## Available Skills

### Workflow
| Skill | Trigger / Description | Scope | Path |
|-------|----------------------|-------|------|
| branch-pr | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | user | `/home/josue/.config/opencode/skills/branch-pr/SKILL.md` |
| chained-pr | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | user | `/home/josue/.config/opencode/skills/chained-pr/SKILL.md` |
| comment-writer | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | user | `/home/josue/.config/opencode/skills/comment-writer/SKILL.md` |
| issue-creation | Create Gentle AI issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | user | `/home/josue/.config/opencode/skills/issue-creation/SKILL.md` |
| judgment-day | Trigger: judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | user | `/home/josue/.config/opencode/skills/judgment-day/SKILL.md` |
| work-unit-commits | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | user | `/home/josue/.config/opencode/skills/work-unit-commits/SKILL.md` |

### Documentation
| Skill | Trigger / Description | Scope | Path |
|-------|----------------------|-------|------|
| cognitive-doc-design | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | user | `/home/josue/.config/opencode/skills/cognitive-doc-design/SKILL.md` |

### UI / Design
| Skill | Trigger / Description | Scope | Path |
|-------|----------------------|-------|------|
| frontend-design | Create distinctive, production-grade frontend interfaces with high design quality. Trigger: building web components, pages, artifacts, posters, or applications (landing pages, dashboards, React components, HTML/CSS layouts, styling/beautifying any web UI). | user | `/home/josue/.agents/skills/frontend-design/SKILL.md` |

### Code Quality
| Skill | Trigger / Description | Scope | Path |
|-------|----------------------|-------|------|
| go-testing | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | user | `/home/josue/.config/opencode/skills/go-testing/SKILL.md` |
| skill-creator | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | user | `/home/josue/.config/opencode/skills/skill-creator/SKILL.md` |
| skill-improver | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | user | `/home/josue/.config/opencode/skills/skill-improver/SKILL.md` |

### Configuration
| Skill | Trigger / Description | Scope | Path |
|-------|----------------------|-------|------|
| customize-opencode | Use ONLY when editing or creating opencode's own configuration. Trigger: editing opencode.json, agents, sub-agents, skills, plugins, MCP servers, or permission rules. | built-in | `<built-in>` |

> **Note**: SDD skills (`sdd-*`) and `_shared` are excluded from this index — they are reserved for orchestrator-managed SDD workflows. Project conventions are in `AGENTS.md`.
