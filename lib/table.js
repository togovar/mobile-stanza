export const rowSpanize = table => {
  if (!table) {
    return;
  }

  let lastSeenCells = [];
  processCellsForRowspan(table, lastSeenCells)
  applyRowspanAttributes(table);
  removeExtraCells(table);
};

function processCellsForRowspan(table, lastSeenCells) {
  table.querySelectorAll("tr").forEach((tr) => {
    tr.querySelectorAll("td").forEach((td, columnIndex) => {
      const currentHtml = td.innerHTML;
      if (shouldCombine(lastSeenCells, columnIndex, currentHtml, td)) {
        const newRowspan = getCurrentRowspan(lastSeenCells[columnIndex].elem) + 1;
        lastSeenCells[columnIndex].elem.setAttribute("data-rowspan", newRowspan);
        lastSeenCells[columnIndex].elem.classList.add("rowspan-combine");
        td.classList.add("rowspan-remove");
      } else {
        lastSeenCells[columnIndex] = {html: currentHtml, elem: td};
      }
    });
  });
}

function shouldCombine(lastSeenCells, index, html, td) {
  return typeof lastSeenCells[index] !== "undefined" && lastSeenCells[index].html === html && !td.classList.contains("clinical-significance-col");
}
function getCurrentRowspan(element) {
  return parseInt(element.getAttribute("data-rowspan")) || 1;
}

function applyRowspanAttributes(table) {
  table.querySelectorAll(".rowspan-combine").forEach(tr => {
    tr.setAttribute("rowspan", tr.getAttribute("data-rowspan"));
    tr.removeAttribute("data-rowspan");
  });
}

function removeExtraCells(table) {
  table.querySelectorAll(".rowspan-remove").forEach(td => {
    td.parentNode.removeChild(td);
  });
}