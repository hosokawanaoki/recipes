// レシピデータを変数に格納
let recipes = [];
let categories = {};
// 表示中のレシピを保持する配列
let displayedRecipes = [];

// Googleスプレッドシートからデータを読み込む関数
function loadRecipesFromSpreadsheet() {
  return new Promise((resolve, reject) => {
    // デバッグ情報を表示エリアに追加
    const debugElement = document.getElementById("debugInfo");
    if (debugElement) {
      debugElement.innerHTML += `<p>Googleスプレッドシートからデータを読み込み中...</p>`;
    }

    // ローディングステータスを更新
    const loadingElement = document.getElementById("loadingStatus");
    if (loadingElement) {
      loadingElement.textContent = `レシピデータを読み込み中...`;
    }

    // スプレッドシートのID
    const spreadsheetId = "10E1tLkOrJvdyhMqo4uoqnDcODbPAcxCS";

    // スプレッドシートのデータを取得するURL
    // gid=1142479739はシートのID
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=1142479739`;

    fetch(url, {
      mode: "cors",
      headers: {
        Origin: window.location.origin,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        // Google Sheetsの応答は純粋なJSONではなく、JavaScriptのコールバック形式になっているため、
        // 正規表現を使用して実際のJSONデータを抽出する
        const jsonData = text.match(
          /google\.visualization\.Query\.setResponse\((.*)\);/
        );
        if (jsonData && jsonData[1]) {
          const data = JSON.parse(jsonData[1]);

          // スプレッドシートのデータを解析
          const table = data.table;
          const cols = table.cols.map((col) => col.label);
          const rows = table.rows;

          // レシピデータに変換
          recipes = rows.map((row) => {
            const values = row.c.map((cell) =>
              cell ? cell.v || "" : ""
            );

            // スプレッドシートの列の順序に基づいてデータをマッピング
            // 列の順序: レシピ名, カテゴリー, サブカテゴリー, サブサブカテゴリー, 材料, 手順, 参照URL, 評価
            return {
              id: values[0] || "",
              category: values[1] || "",
              subcategory: values[2] || "",
              subsubcategory: values[3] || "",
              materials: values[4] ? values[4].split("\n") : [],
              steps: values[5] ? values[5].split("\n") : [],
              reference: values[6] || "",
              rating: values[7] || "",
            };
          });

          if (debugElement) {
            debugElement.innerHTML += `<p>読み込み成功: ${recipes.length}件のレシピを読み込みました</p>`;
          }

          resolve(recipes);
        } else {
          throw new Error(
            "スプレッドシートのデータを解析できませんでした"
          );
        }
      })
      .catch((error) => {
        console.error("Error loading spreadsheet data:", error);
        if (debugElement) {
          debugElement.innerHTML += `<p>エラー: ${error.message}</p>`;
        }
        reject(error);
      });
  });
}

// ページ読み込み時にデータを処理
window.onload = async function () {
  // レシピコンテンツエリアを取得
  const recipeContentElement = document.getElementById("recipeContent");
  if (!recipeContentElement) {
    console.error("recipeContent element not found");
    return;
  }

  // ローディングステータスを表示
  const loadingElement = document.createElement("div");
  loadingElement.id = "loadingStatus";
  loadingElement.style.textAlign = "center";
  loadingElement.style.padding = "20px";
  loadingElement.style.fontWeight = "bold";
  loadingElement.textContent = "レシピデータを読み込み中...";
  recipeContentElement.appendChild(loadingElement);

  // デバッグ情報表示エリアを作成
  const debugElement = document.createElement("div");
  debugElement.id = "debugInfo";
  debugElement.style.border = "1px solid #ccc";
  debugElement.style.padding = "10px";
  debugElement.style.margin = "10px 0";
  debugElement.style.backgroundColor = "#f9f9f9";
  debugElement.style.maxHeight = "200px";
  debugElement.style.overflow = "auto";
  debugElement.innerHTML = "<h3>デバッグ情報</h3>";
  recipeContentElement.appendChild(debugElement);

  try {
    // Googleスプレッドシートからデータを読み込む
    await loadRecipesFromSpreadsheet();

    // 読み込み結果を表示
    debugElement.innerHTML += `<p>読み込み完了: 合計${recipes.length}件のレシピを読み込みました</p>`;

    if (recipes.length > 0) {
      // ローディングステータスを削除
      const loadingStatusElement =
        document.getElementById("loadingStatus");
      if (loadingStatusElement) {
        loadingStatusElement.remove();
      }

      // カテゴリメニューを生成
      generateCategoryMenu();

      // URLハッシュがあれば対応するレシピを表示
      if (window.location.hash) {
        showRecipeFromHash();
      }
    } else {
      // レシピが読み込まれなかった場合
      const loadingStatusElement =
        document.getElementById("loadingStatus");
      if (loadingStatusElement) {
        loadingStatusElement.textContent =
          "レシピデータの読み込みに失敗しました。";
        loadingStatusElement.style.color = "red";
      }
    }
  } catch (error) {
    console.error("Error loading recipe data:", error);
    debugElement.innerHTML += `<p>エラー: ${error.message}</p>`;

    const loadingStatusElement =
      document.getElementById("loadingStatus");
    if (loadingStatusElement) {
      loadingStatusElement.textContent = "エラーが発生しました。";
      loadingStatusElement.style.color = "red";
    }
  }
};

// カテゴリメニューを生成する関数
function generateCategoryMenu() {
  // カテゴリ、サブカテゴリの階層構造を作成
  categories = {};
  recipes.forEach((recipe) => {
    if (!categories[recipe.category]) {
      categories[recipe.category] = {};
    }
    if (!categories[recipe.category][recipe.subcategory]) {
      categories[recipe.category][recipe.subcategory] = {};
    }
    if (
      !categories[recipe.category][recipe.subcategory][
        recipe.subsubcategory
      ]
    ) {
      categories[recipe.category][recipe.subcategory][
        recipe.subsubcategory
      ] = [];
    }
    categories[recipe.category][recipe.subcategory][
      recipe.subsubcategory
    ].push(recipe);
  });

  // HTMLを生成
  const menuElement = document.getElementById("categoryMenu");
  let menuHTML = "";

  for (const category in categories) {
    const categoryId = encodeURIComponent(category);
    menuHTML += `<li><a href="#category-${categoryId}">${category}</a><ul>`;

    for (const subcategory in categories[category]) {
      const subcategoryId = encodeURIComponent(subcategory);
      menuHTML += `<li><a href="#subcategory-${categoryId}-${subcategoryId}">${subcategory}</a><ul>`;

      for (const subsubcategory in categories[category][subcategory]) {
        const subsubcategoryId = encodeURIComponent(subsubcategory);
        menuHTML += `<li><a href="#subsubcategory-${categoryId}-${subcategoryId}-${subsubcategoryId}">${subsubcategory}</a><ul>`;

        categories[category][subcategory][subsubcategory].forEach(
          (recipe) => {
            const recipeId = encodeURIComponent(recipe.id);
            menuHTML += `<li><a href="#recipe-${recipeId}" onclick="showRecipe(recipes.find(r => r.id === '${recipe.id}'))">${recipe.id}</a></li>`;
          }
        );

        menuHTML += `</ul></li>`;
      }

      menuHTML += `</ul></li>`;
    }

    menuHTML += `</ul></li>`;
  }

  menuElement.innerHTML = menuHTML;

  // ハッシュが変更されたときにレシピを表示
  window.addEventListener("hashchange", showRecipeFromHash);
}

// ハッシュからレシピまたはカテゴリを表示する関数
function showRecipeFromHash() {
  const hash = window.location.hash.substring(1);

  if (hash.startsWith("recipe-")) {
    const recipeId = decodeURIComponent(hash.substring(7));
    const recipe = recipes.find((r) => r.id === recipeId);

    if (recipe) {
      showRecipe(recipe);
    }
  } else if (hash.startsWith("category-")) {
    const categoryId = decodeURIComponent(hash.substring(9));
    showCategory(categoryId);
  } else if (hash.startsWith("subcategory-")) {
    const parts = hash.substring(12).split("-");
    const categoryId = decodeURIComponent(parts[0]);
    const subcategoryId = decodeURIComponent(parts[1]);
    showSubcategory(categoryId, subcategoryId);
  } else if (hash.startsWith("subsubcategory-")) {
    const parts = hash.substring(15).split("-");
    const categoryId = decodeURIComponent(parts[0]);
    const subcategoryId = decodeURIComponent(parts[1]);
    const subsubcategoryId = decodeURIComponent(parts[2]);
    showSubsubcategory(categoryId, subcategoryId, subsubcategoryId);
  }
}

// カテゴリを表示する関数
function showCategory(categoryId) {
  const contentElement = document.getElementById("recipeContent");
  let html = `<h1>${categoryId}</h1>`;

  for (const subcategory in categories[categoryId]) {
    html += `<h2>${subcategory}</h2>`;

    for (const subsubcategory in categories[categoryId][subcategory]) {
      html += `<h3>${subsubcategory}</h3>`;

      categories[categoryId][subcategory][subsubcategory].forEach(
        (recipe) => {
          html += `<h4><a href="#recipe-${encodeURIComponent(
            recipe.id
          )}">${recipe.id}</a></h4>`;
        }
      );
    }
  }

  // カテゴリ表示時は表示中のレシピをクリア
  displayedRecipes = [];
  contentElement.innerHTML = html;
}

// サブカテゴリを表示する関数
function showSubcategory(categoryId, subcategoryId) {
  const contentElement = document.getElementById("recipeContent");
  let html = `<h1>${categoryId}</h1><h2>${subcategoryId}</h2>`;

  for (const subsubcategory in categories[categoryId][subcategoryId]) {
    html += `<h3>${subsubcategory}</h3>`;

    categories[categoryId][subcategoryId][subsubcategory].forEach(
      (recipe) => {
        html += `<h4><a href="#recipe-${encodeURIComponent(
          recipe.id
        )}">${recipe.id}</a></h4>`;
      }
    );
  }

  // サブカテゴリ表示時は表示中のレシピをクリア
  displayedRecipes = [];
  contentElement.innerHTML = html;
}

// サブサブカテゴリを表示する関数
function showSubsubcategory(
  categoryId,
  subcategoryId,
  subsubcategoryId
) {
  const contentElement = document.getElementById("recipeContent");
  let html = `<h1>${categoryId}</h1><h2>${subcategoryId}</h2><h3>${subsubcategoryId}</h3>`;

  categories[categoryId][subcategoryId][subsubcategoryId].forEach(
    (recipe) => {
      html += `<h4><a href="#recipe-${encodeURIComponent(recipe.id)}">${
        recipe.id
      }</a></h4>`;
    }
  );

  // サブサブカテゴリ表示時は表示中のレシピをクリア
  displayedRecipes = [];
  contentElement.innerHTML = html;
}

// レシピを表示する関数
function showRecipe(recipe) {
  const contentElement = document.getElementById("recipeContent");

  // 既に表示されているレシピかチェック
  const existingIndex = displayedRecipes.findIndex(
    (r) => r.id === recipe.id
  );

  // 既に表示されている場合は配列から削除
  if (existingIndex !== -1) {
    displayedRecipes.splice(existingIndex, 1);
  }

  // 新しいレシピを配列の先頭に追加
  displayedRecipes.unshift(recipe);

  // すべての表示中レシピをHTMLに変換
  let html = "";

  displayedRecipes.forEach((displayedRecipe, index) => {
    html += `
      <div class="recipe-item" ${
        index > 0 ? 'style="margin-top: 40px;"' : ""
      }>
        <h1 id="${displayedRecipe.id}">${displayedRecipe.id}</h1>
        <p>★材料</p>
        <pre><code>${displayedRecipe.materials.join("\n")}</code></pre>
        <p>★手順</p>
        <pre><code>${displayedRecipe.steps.join("\n")}</code></pre>
    `;

    if (displayedRecipe.reference) {
      html += `<p><a href="${displayedRecipe.reference}" target="_blank">${displayedRecipe.id}</a></p>`;
    }

    html += `<p>★評価\n　${displayedRecipe.rating}</p>`;

    // 最後のレシピ以外は区切り線を追加
    if (index < displayedRecipes.length - 1) {
      html += `<hr>`;
    }

    html += `</div>`;
  });

  contentElement.innerHTML = html;
}

// 検索機能
function searchRecipes() {
  const query = document
    .getElementById("searchInput")
    .value.toLowerCase();
  if (!query) {
    document.getElementById("result").innerHTML = "";
    return;
  }

  let resultHTML = "";

  recipes.forEach((recipe) => {
    // レシピ名、材料、手順のいずれかに検索キーワードが含まれているか確認
    if (
      recipe.id.toLowerCase().includes(query) ||
      recipe.materials.some((m) => m.toLowerCase().includes(query)) ||
      recipe.steps.some((s) => s.toLowerCase().includes(query))
    ) {
      resultHTML += `<a href="#recipe-${encodeURIComponent(
        recipe.id
      )}">${recipe.id}</a>`;
    }
  });

  // 検索結果表示時は表示中のレシピをクリアしない
  document.getElementById("result").innerHTML =
    resultHTML || "<p>該当する結果がありません。</p>";
}
