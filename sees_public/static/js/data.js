// SPDX-License-Identifier: MIT

document.addEventListener("DOMContentLoaded", () => {
  let originalData = [...dataFromFlask];
  let filteredData = [...originalData];

  const tbody = document.querySelector("#dataTable tbody");
  const yearFilter = document.getElementById("year");
  const numPerPage = document.getElementById("num-per-page");
  const headers = document.querySelectorAll("#dataTable th");
  const pageInfo = document.getElementById("pageInfo");
  const prevButton = document.getElementById("prevPage");
  const nextButton = document.getElementById("nextPage");
  const searchInput = document.getElementById("searchInput");

  const numericColumns = new Set(["id", "year"]);

  let currentFilter = {
    column: null,
    ascending: true,
    numPerPage: parseInt(numPerPage.value, 10),
    currentPage: 1,
  };

  let searchTimeout = null;

  function renderTable(data) {
    tbody.innerHTML = "";

    const totalPages = Math.ceil(data.length / currentFilter.numPerPage) || 1;

    if (currentFilter.currentPage > totalPages) {
      currentFilter.currentPage = totalPages;
    } else if (currentFilter.currentPage < 1) {
      currentFilter.currentPage = 1;
    }

    const start = (currentFilter.currentPage - 1) * currentFilter.numPerPage;
    const end = start + currentFilter.numPerPage;

    const pageData = data.slice(start, end);

    pageData.forEach((row) => {
      const tr = document.createElement("tr");

      const idCell = document.createElement("td");
      idCell.textContent = row.id;

      const titleCell = document.createElement("td");
      const link = document.createElement("a");
      link.href = `/data/${encodeURIComponent(row.year)}/${encodeURIComponent(row.id)}`;
      link.textContent = row.title;
      titleCell.appendChild(link);

      const authorCell = document.createElement("td");
      authorCell.textContent = row.author;

      const yearCell = document.createElement("td");
      yearCell.textContent = row.year;

      tr.append(idCell, titleCell, authorCell, yearCell);
      tbody.appendChild(tr);
    });

    pageInfo.textContent = `Page ${currentFilter.currentPage}`;
    prevButton.disabled = currentFilter.currentPage === 1;
    nextButton.disabled = currentFilter.currentPage === totalPages;
  }

  function updateSortArrows() {
    headers.forEach((header) => {
      const arrow = header.querySelector(".sort-arrow");
      const column = header.dataset.column;

      if (!arrow) return;

      if (column === currentFilter.column) {
        arrow.textContent = currentFilter.ascending ? "↑" : "↓";
        header.setAttribute(
          "style",
          "border-bottom:4px solid var(--accent-primary);",
        );
      } else {
        arrow.textContent = "";
        header.setAttribute("style", "border-bottom: 4px solid transparent");
      }
    });
  }

  function sortData(column, ascending = true) {
    const key = (row) =>
      numericColumns.has(column)
        ? Number(row[column])
        : String(row[column]).toLowerCase();
    filteredData.sort((a, b) => {
      const aValue = key(a);
      const bValue = key(b);
      if (aValue < bValue) return ascending ? -1 : 1;
      if (aValue > bValue) return ascending ? 1 : -1;
    });

    currentFilter.column = column;
    currentFilter.ascending = ascending;
    updateSortArrows();
    return filteredData;
  }

  function applyFilter() {
    const selectedYear = yearFilter.value;

    if (selectedYear === "all") {
      filteredData = [...originalData];
    } else {
      filteredData = originalData.filter(
        (row) => String(row.year) === selectedYear,
      );
    }

    if (currentFilter.column) {
      filteredData = sortData(currentFilter.column, currentFilter.ascending);
    }
    renderTable(filteredData);
  }

  function setNumItemsPerPage() {
    currentFilter.numPerPage = parseInt(numPerPage.value, 10);
    currentFilter.currentPage = 1;
    renderTable(filteredData);
  }

  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const column = header.dataset.column;
      let ascending = true;

      if (currentFilter.column === column) {
        ascending = !currentFilter.ascending;
      }

      data = sortData(column, ascending);
      renderTable(data);
    });
  });

  prevButton.addEventListener("click", function () {
    if (currentFilter.currentPage > 1) {
      currentFilter.currentPage--;
      renderTable(filteredData);
    }
  });

  nextButton.addEventListener("click", function () {
    const totalPages = Math.ceil(
      filteredData.length / currentFilter.numPerPage,
    );
    if (currentFilter.currentPage < totalPages) {
      currentFilter.currentPage++;
      renderTable(filteredData);
    }
  });

  // Listener for search input:
  // Listen on input. Timeout of 300 ms calling function. The search function will send request to Flask.
  // Flask will query the ES index and return JSON array of objects. JS will render the array into the table.
  // If no input, revert to original data
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(searchInput.value);
    }, 300);
  });

  function performSearch(value) {
    searchController?.abort();
    searchController = new AbortController();
    fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
      signal: searchController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        originalData = data;
        currentFilter.currentPage = 1;
        applyFilter();
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
  }

  yearFilter.addEventListener("change", applyFilter);
  numPerPage.addEventListener("change", setNumItemsPerPage);

  renderTable(filteredData);
  updateSortArrows();
});
