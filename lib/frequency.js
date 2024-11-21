/** Finds the top-level parent of a given node ID in a nested data structure.
* @param {Array<Object>} data - The nested data structure to search.
* @param {string} id - The ID of the node to find the top-level parent for.
* @returns {Object|null} The top-level parent node or null if not found. */
export const findTopParent = (data, id) => {
  // 内部で再帰的に探索する関数
  function recursiveSearch(nodes, targetId, parent = null) {
    for (const node of nodes) {
      if (node.id === targetId) {
        // ターゲットIDが見つかったら、トップレベルの親を返す
        return parent || node;
      }
      if (node.children) {
        const found = recursiveSearch(node.children, targetId, parent || node);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
  return recursiveSearch(data, id);
}

/** Finds the direct parent of a given node ID in a nested data structure.
* @param {Array<Object>} data - The nested data structure to search.
* @param {string} id - The ID of the node to find the parent for.
* @returns {Object|null} The parent node or null if not found. */
export const findParent = (data, id) => {
  function recursiveSearch(nodes, targetId, parent = null) {
    for (const node of nodes) {
      if (node.id === targetId) {
        // ターゲットIDが見つかったら、そのノードの親を返す
        return parent;
      }
      if (node.children) {
        const found = recursiveSearch(node.children, targetId, node);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
  return recursiveSearch(data, id);
}

export const updateParentClass = (datasets, data) => {
  datasets.forEach(datum => {
    const dataNode = data.find(d => d.source === datum.value);
    if (dataNode) {
      dataNode.has_child = false;
    }

    if (datum.children?.length > 0 && dataNode) {
      // 子供の一致を確認
      const hasMatchingChild = datum.children.some(child =>
        data.some(d => d.source === child.value)
      );
      const hasMatchingChildSub = datum.children.some(child =>
        data.some(d => d.label === child.label)
      );

      if (hasMatchingChild || hasMatchingChildSub) {
        dataNode.has_child = true;
      }
    }

    // 子供を持つノードに対して再帰的に同じ処理を行う
    if (datum.children && datum.children.length > 0) {
      updateParentClass(datum.children, data);
    }
  });
};