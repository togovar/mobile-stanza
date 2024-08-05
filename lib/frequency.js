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

/** Counts the number of parents for a given node ID in a nested data structure.
* @param {Array<Object>} data - The nested data structure to search.
* @param {string} id - The ID of the node to count the parents for.
* @returns {number|null} The number of parent nodes or null if not found. */
export const countParents = (data, id) => {
  function recursiveSearch(nodes, targetId, parentCount = 0) {
    for (const node of nodes) {
      if (node.id === targetId) {
        // ターゲットIDが見つかったら、親の数を返す
        return parentCount;
      }
      if (node.children) {
        const found = recursiveSearch(node.children, targetId, parentCount + 1);
        if (found !== null) {
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

    if (datum.children?.length > 0 && dataNode) {
      let hasMatchingChildSub = false;
      let hasMatchingChild = false;

      // 子供のラベルと一致するものがdataのlabelにあるかチェック
      datum.children.forEach(child => {
        if (data.some(d => d.source === child.value)) {
          hasMatchingChild = true;
        }
        if (data.some(d => d.label === child.label)) {
          hasMatchingChildSub = true;
        }
      });

      // 一致するものがない場合、クラス名を変更
      if (!hasMatchingChild) {
        const changeClass = data.find(d => d.source === datum.value);
        if (changeClass) {
          if (changeClass.source !== "jga_snp" && changeClass.class_name === "layer-total") {
            changeClass.class_name = "total-no-children";
          }
          if (changeClass.class_name === "layer1-haschild") {
            changeClass.class_name = "layer1-nonchild";
          }
          if (changeClass.class_name === "layer2") {
            changeClass.class_name = "layer2-nonchild";
          }
        }
      }

      if (!hasMatchingChildSub) {
        const changeClass = data.find(d => d.source === datum.value);
        if (changeClass) {
          if (changeClass.class_name === "layer-total") {
            changeClass.class_name = "total-no-children";
          }
        }
      }
    }

    // 子供を持つノードに対して再帰的に同じ処理を行う
    if (datum.children && datum.children.length > 0) {
      updateParentClass(datum.children, data);
    }
  });
};