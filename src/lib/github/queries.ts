/**
 * Repository Analysis Query
 * Targets a specific repository (owner + name), not a user profile.
 * Adapted from SwiftHyre Phase 2 query but scoped to a single repo for judge review.
 */
export const REPO_ANALYSIS_QUERY = `
  query RepoAnalysis($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      name
      description
      primaryLanguage { name }

      languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
        edges {
          size
          node { name }
        }
      }

      repositoryTopics(first: 10) {
        nodes { topic { name } }
      }

      stargazerCount
      forkCount
      pushedAt

      mentionableUsers { totalCount }

      # README content
      readme: object(expression: "HEAD:README.md") {
        ... on Blob { text }
      }

      # package.json for dependency analysis
      packageJson: object(expression: "HEAD:package.json") {
        ... on Blob { text }
      }

      # Root directory structure
      rootTree: object(expression: "HEAD:") {
        ... on Tree {
          entries { name type }
        }
      }

      # 10 most recent commits with change stats
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 10) {
              nodes {
                message
                committedDate
                additions
                deletions
                author { name email }
              }
            }
          }
        }
      }
    }
  }
`
