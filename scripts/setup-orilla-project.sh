#!/usr/bin/env bash
# Crea el GitHub Project Kanban de Orilla y engancha issues #1–#8.
# Requisito: gh auth refresh -h github.com -s project,read:project
set -euo pipefail

OWNER="Jgmaza"
REPO="bb101-caribe-lab"
TITLE="Orilla MVP Backlog"

echo "Creando project: $TITLE"
PROJECT_JSON=$(gh project create --owner "$OWNER" --title "$TITLE" --format json)
PROJECT_NUMBER=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['number'])")
PROJECT_URL=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")
PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "Project #$PROJECT_NUMBER → $PROJECT_URL"

for n in 1 2 3 4 5 6 7 8; do
  echo "Añadiendo issue #$n..."
  ISSUE_ID=$(gh api graphql -f query="query { repository(owner:\"$OWNER\", name:\"$REPO\") { issue(number:$n) { id } } }" --jq '.data.repository.issue.id')
  gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "https://github.com/$OWNER/$REPO/issues/$n" >/dev/null || \
    gh api graphql -f query='mutation($project:ID!, $content:ID!) {
      addProjectV2ItemById(input: {projectId: $project, contentId: $content}) { item { id } }
    }' -f project="$PROJECT_ID" -f content="$ISSUE_ID" >/dev/null
done

echo ""
echo "Listo. Actualiza ProductBlueprint.md con:"
echo "$PROJECT_URL"
