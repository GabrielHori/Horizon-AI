export const AI_STYLES = [
  { id: 'quick' },
  { id: 'clear' },
  { id: 'creative' },
  { id: 'structured' },
  { id: 'precise' }
];

export const DEFAULT_STYLE_ID = 'clear';

const getSizeBytes = (model) => {
  const size = Number(model?.size);
  return Number.isFinite(size) && size > 0 ? size : 0;
};

const pickSmallest = (models) => {
  const withSize = models.filter((m) => getSizeBytes(m) > 0);
  if (withSize.length > 0) {
    return withSize.sort((a, b) => getSizeBytes(a) - getSizeBytes(b))[0];
  }
  return models[0] || null;
};

const pickLargest = (models) => {
  const withSize = models.filter((m) => getSizeBytes(m) > 0);
  if (withSize.length > 0) {
    return withSize.sort((a, b) => getSizeBytes(b) - getSizeBytes(a))[0];
  }
  return models[0] || null;
};

const pickClosestToMedian = (models) => {
  const withSize = models.filter((m) => getSizeBytes(m) > 0);
  if (withSize.length < 2) {
    return models[0] || null;
  }
  const sizes = withSize.map((m) => getSizeBytes(m)).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)];
  return withSize.sort((a, b) => Math.abs(getSizeBytes(a) - median) - Math.abs(getSizeBytes(b) - median))[0];
};

const pickByName = (models, tokens) => {
  if (!tokens?.length) return null;
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  return models.find((model) => {
    const name = String(model?.name || '').toLowerCase();
    return lowerTokens.some((token) => name.includes(token));
  }) || null;
};

const sortBySize = (models, direction = 'asc') => {
  const sorted = [...models].sort((a, b) => getSizeBytes(a) - getSizeBytes(b));
  return direction === 'desc' ? sorted.reverse() : sorted;
};

const filterByTokens = (models, tokens) => {
  if (!tokens?.length) return models;
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  const filtered = models.filter((model) => {
    const name = String(model?.name || '').toLowerCase();
    return lowerTokens.some((token) => name.includes(token));
  });
  return filtered.length > 0 ? filtered : models;
};

export const getModelsForStyle = (models, styleId) => {
  const available = Array.isArray(models)
    ? models.filter((model) => model?.name)
    : [];

  if (available.length === 0) {
    return [];
  }

  if (styleId === 'quick') {
    return sortBySize(available, 'asc');
  }

  if (styleId === 'precise') {
    return sortBySize(available, 'desc');
  }

  if (styleId === 'creative') {
    return filterByTokens(available, ['mistral', 'llama', 'mixtral']);
  }

  if (styleId === 'structured') {
    return filterByTokens(available, ['qwen', 'deepseek', 'coder']);
  }

  return filterByTokens(available, ['llama', 'mistral']);
};

export const resolveModelForStyle = (models, styleId) => {
  const available = Array.isArray(models)
    ? models.filter((model) => model?.name)
    : [];

  if (available.length === 0) {
    return null;
  }

  if (styleId === 'quick') {
    return pickSmallest(available);
  }

  if (styleId === 'precise') {
    return pickLargest(available);
  }

  if (styleId === 'creative') {
    return pickByName(available, ['mistral', 'llama', 'mixtral']) || pickClosestToMedian(available);
  }

  if (styleId === 'structured') {
    return pickByName(available, ['qwen', 'deepseek', 'coder']) || pickClosestToMedian(available);
  }

  return pickByName(available, ['llama', 'mistral']) || pickClosestToMedian(available) || available[0];
};
