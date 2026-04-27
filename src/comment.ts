import * as github from "@actions/github";

const COMMENT_MARKER = "<!-- terraform-risk-assessor -->";

export const postOrUpdateComment = async (
  token: string,
  markdown: string
): Promise<void> => {
  const context = github.context;

  if (!context.payload.pull_request) {
    throw new Error("No pull request context found — comment-on-pr requires a PR-triggered workflow");
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = context.repo;
  const prNumber = context.payload.pull_request.number;

  const body = `${COMMENT_MARKER}\n${markdown}`;

  // Look for an existing comment from this action to update
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
};
