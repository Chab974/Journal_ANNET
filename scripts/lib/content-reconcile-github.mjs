import {
  createDefaultProductionReconcileState,
  parseProductionReconcileState,
  productionReconcileIssueTitle,
  serializeProductionReconcileState,
} from './content-reconcile-state.mjs';
import {
  dispatchGitHubWorkflow,
  fetchGitHubIssue,
  parsePositiveInteger,
  resolveGitHubRepositoryConfig,
  updateGitHubIssue,
} from './github-api.mjs';

export function resolveProductionReconcileStateConfig(env = process.env) {
  return {
    ...resolveGitHubRepositoryConfig(env),
    issueNumber: parsePositiveInteger(
      env.CONTENT_RECONCILE_STATE_ISSUE_NUMBER,
      'CONTENT_RECONCILE_STATE_ISSUE_NUMBER',
    ),
  };
}

export function resolveProductionWorkflowDispatchConfig(env = process.env) {
  return {
    ...resolveGitHubRepositoryConfig(env),
    workflowFile: env.GITHUB_PRODUCTION_WORKFLOW_FILE || 'reconcile-prod-deploy.yml',
    workflowRef: env.GITHUB_PRODUCTION_WORKFLOW_REF || env.GITHUB_WORKFLOW_REF || 'main',
  };
}

export async function loadProductionReconcileState(config, { fetchImpl } = {}) {
  const issue = await fetchGitHubIssue(config, {
    fetchImpl,
    issueNumber: config.issueNumber,
  });

  return {
    issue,
    state: issue?.body ? parseProductionReconcileState(issue.body) : createDefaultProductionReconcileState(),
  };
}

export async function saveProductionReconcileState(config, { fetchImpl, state } = {}) {
  return updateGitHubIssue(config, {
    body: serializeProductionReconcileState(state),
    fetchImpl,
    issueNumber: config.issueNumber,
    title: productionReconcileIssueTitle,
  });
}

export async function dispatchProductionReconcileWorkflow(config, { fetchImpl, inputs = {} } = {}) {
  const result = await dispatchGitHubWorkflow(config, {
    fetchImpl,
    inputs,
    ref: config.workflowRef,
    workflowFile: config.workflowFile,
  });

  return {
    ...result,
    ref: config.workflowRef,
  };
}
