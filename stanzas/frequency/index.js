import Stanza from "togostanza/stanza";
import { DATASETS } from "@/lib/constants";
import { findTopParent, countParents, findParent, updateParentClass } from "@/lib/frequency";

export default class MobileFrequency extends Stanza {
  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS(
      "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900"
    );
    // database icon
    this.importWebFontCSS(
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    );

    const { "data-url": urlBase, assembly, variant_id } = this.params;
    const dataURL = `${urlBase}/search?quality=0&term=${variant_id}&expand_dataset`
    let resultObject = [];
    let currentLayer1;
    let hasHemizygote = false;

    const datasets = Object.values(DATASETS);

    try {
      const response = await fetch(dataURL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`${dataURL} returns status ${response.status}`);
      }

      const responseDatasets = await response.json();
      const frequenciesDatasets = responseDatasets.data[0]?.frequencies;

      const searchData = (datum, depth = 0) => {
        const frequencyData = frequenciesDatasets?.find(
          (x) => x.source === datum.value
        );
        if (frequencyData) {
          // 数値をロケール形式の文字列に変換する関数
          const localeString = (v) =>
            v !== undefined ? parseInt(v).toLocaleString() : null;

          if (datum.value === "tommo") {
            switch (assembly) {
              case "GRCh37":
                frequencyData.dataset = "ToMMo 8.3KJPN";
                break;
              case "GRCh38":
                frequencyData.dataset = "ToMMo 54KJPN";
                break;
              default:
                frequencyData.dataset = "ToMMo";
            }
          } else {
            frequencyData.dataset = findTopParent(datasets, datum.id).label;
          }

          if (["gem_j_wga", "jga_ngs", "tommo", "hgvd"].includes(datum.value)) {
            frequencyData.label = "Japanese";
          } else if (
            ["jga_snp", "ncbn", "gnomad_genomes", "gnomad_exomes"].includes(
              datum.value
            )
          ) {
            frequencyData.label = "Total";
          } else {
            frequencyData.label = datum.label;
          }

          // Alt
          frequencyData.ac = localeString(frequencyData.ac);
          // Total
          frequencyData.an = localeString(frequencyData.an);
          // Alt/Alt
          frequencyData.aac = localeString(frequencyData.aac);
          // Alt/Ref
          frequencyData.arc = localeString(frequencyData.arc);
          // Ref/Ref
          frequencyData.rrc = localeString(frequencyData.rrc);

          const frequency = parseFloat(frequencyData.af);
          frequencyData.frequency = parseFloat(frequency).toExponential(2);
          frequencyData.indicator = frequency < 0.0001 ? 1 : frequency < 0.001 ? 2 : frequency < 0.01 ? 3 : frequency < 0.05 ? 4 : frequency < 0.5 ? 5 : 6;

          if (
            !hasHemizygote &&
            (frequencyData.hemi_alt || frequencyData.hemi_ref)
          ) {
            hasHemizygote = true;
          }

          // 開閉を行うtoggleを作成するため、クラスを設定
          let className = "layer-none";
          if (frequencyData.label === "Total") {
            className = "layer-total";
          } else if (frequencyData.dataset === "JGA-SNP") {
            if (countParents(datasets, datum.id) === 2) {
              className = "layer2";
            } else {
              className = "layer3";
            }
          } else if (frequencyData.dataset === "NCBN") {
            if (frequencyData.source === "ncbn.jpn") {
              className = "layer1-haschild";
            }
            if (countParents(datasets, datum.id) === 2) {
              className = "layer2-nonchild";
            }
            if (
              frequencyData.source !== "ncbn.jpn" &&
              countParents(datasets, datum.id) !== 2
            ) {
              className = "layer1-nonchild";
            }
          } else if (
            ![
              "gem_j_wga",
              "jga_ngs",
              "jga_snp",
              "tommo",
              "ncbn",
              "gnomad_genomes",
              "gnomad_exomes",
            ].includes(frequencyData.source)
          ) {
            className = "layer1-nonchild";
          }
          frequencyData.class_name = className;

          // JGA-SNPの場合 見出しのdataがないため追加
          if (frequencyData.dataset === "JGA-SNP") {
            if (currentLayer1 !== frequencyData.label) {
              const parentCount = countParents(datasets, datum.id);
              if (
                parentCount === 2 &&
                currentLayer1 !== findParent(datasets, datum.id).label
              ) {
                let data = {
                  dataset: frequencyData.dataset,
                  label: findParent(datasets, datum.id).label,
                  class_name: "sub-layer",
                  source: `${frequencyData.dataset}-title`,
                };
                resultObject = [...resultObject, data];
                currentLayer1 = findParent(datasets, datum.id).label;
              }
            }

            if (findParent(datasets, datum.id)?.label) {
              if (countParents(datasets, datum.id) === 2) {
                frequencyData.layer1 = findParent(datasets, datum.id).label;
              } else {
                frequencyData.layer1 = findParent(
                  datasets,
                  findParent(datasets, datum.id).id
                ).label;
                frequencyData.layer2 = findParent(datasets, datum.id).label;
              }
            }
          }

          resultObject = [...resultObject, frequencyData];
        }

        if (datum.children) {
          datum.children.forEach((child) => searchData(child, depth + 1));
        }
      };

      datasets.forEach(searchData);

      // クラス名を更新
      updateParentClass(datasets, resultObject);

      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          result: resultObject,
          no_data_message: this.params.no_data_message
        },
      });

      // リスト要素の不要な部分を削除
      const lists = this.root.querySelectorAll("main > ul > li");
      lists.forEach((list) => {

        // layer-none と layer-total と total-no-children 以外の要素から h2 要素を削除
        if (
          !(
            list.className.includes("layer-none") ||
            list.className.includes("layer-total") ||
            list.className.includes("total-no-children")
          )
        ) {
          list.querySelector("h2").remove();

          // sub-layer要素から count, frequency, filter-status 要素を削除
          if (list.className.includes("sub-layer")) {
            list.querySelector(".count").remove();
            list.querySelector(".frequency").remove();
            list.querySelector(".filter-status").remove();
          }
        }
      });
    } catch (e) {
      console.error(e.message);
    }

    /** ネストされたアイテムのサブセットを親要素に追加する関数。
     * @param {HTMLElement} parent - サブセットを追加する親要素。
     * @param {HTMLElement[]} nestedItems - 親要素に追加するネストされたアイテムの配列。 */
    const appendSubset = (parent, nestedItems) => {
      if (!parent || nestedItems.length === 0) return;

      // h2要素の重複を防ぐための処理
      nestedItems = nestedItems.filter((item) => item.tagName !== "H2");

      const subset = document.createElement("section");
      subset.classList.add("subset");
      subset.style.overflow = "hidden"; // 見切れ防止
      subset.style.transition = "max-height 0.3s ease"; // 開閉のアニメーション

      subset.append(...nestedItems);
      parent.append(subset);

      // 開閉ボタンを探してクリックイベントを追加
      const collapseButton = parent.querySelector(
        ":scope > .dataset > .ethnic"
      );
      if (collapseButton) {
        collapseButton.addEventListener("click", () => {
          parent.classList.toggle("open");
          subset.style.maxHeight = parent.classList.contains("open")
            ? "9999px"
            : "0px";
        });
      }

      // 初期化時にサブセットの高さを設定
      requestAnimationFrame(() => {
        subset.style.maxHeight = "0"; // 初期状態で高さを0に設定
      });
    };

    /** ネストされたアイテムを処理して適切な親要素に追加する関数。
     * @param {HTMLElement[]} items - 処理するネストされたアイテムの配列。 */
    const processNestedItems = (items) => {
      let currentTotalItem = null;
      let layer1Items = [];
      let layer2Items = [];
      let layer3Items = [];
      let subLayerItems = [];

      const appendLayer3ToLayer2 = () => {
        if (layer3Items.length > 0) {
          appendSubset(layer2Items.at(-1), layer3Items);
          layer3Items = [];
        }
      };

      const appendLayer2ToLayer1 = () => {
        if (layer2Items.length > 0) {
          appendSubset(layer1Items.at(-1), layer2Items);
          layer2Items = [];
        }
      };

      const appendLayer2ToSubLayer = () => {
        if (layer2Items.length > 0) {
          appendSubset(subLayerItems.at(-1), layer2Items);
          layer2Items = [];
        }
      };

      const appendSubLayerToTotal = () => {
        if (subLayerItems.length > 0 && currentTotalItem) {
          appendSubset(currentTotalItem, subLayerItems);
          subLayerItems = [];
        }
      };

      const appendLayer1ToTotal = () => {
        if (layer1Items.length > 0 && currentTotalItem) {
          appendSubset(currentTotalItem, layer1Items);
          layer1Items = [];
        }
      };

      items.forEach((item) => {
        if (item.classList.contains("layer-total")) {
          appendLayer3ToLayer2();
          if (subLayerItems.length > 0) {
            appendLayer2ToSubLayer();
            appendSubLayerToTotal();
          } else {
            appendLayer2ToLayer1();
            appendLayer1ToTotal();
          }
          currentTotalItem = item;

        } else if (item.classList.contains("sub-layer")) {
          appendLayer3ToLayer2();
          appendLayer2ToSubLayer();
          subLayerItems.push(item);

        } else if (
          item.classList.contains("layer1-haschild") ||
          item.classList.contains("layer1-nonchild")
        ) {
          appendLayer3ToLayer2();
          appendLayer2ToLayer1();
          layer1Items.push(item);

        } else if (
          item.classList.contains("layer2") ||
          item.classList.contains("layer2-nonchild")
        ) {
          appendLayer3ToLayer2();
          layer2Items.push(item);

        } else if (item.classList.contains("layer3")) {
          layer3Items.push(item);
        }
      });

      // 最後に残ったアイテムを追加する
      appendLayer3ToLayer2();
      if (subLayerItems.length > 0) {
        appendLayer2ToSubLayer();
        appendSubLayerToTotal();
      } else {
        appendLayer2ToLayer1();
        appendLayer1ToTotal();
      }
    };

    const list = Array.from(this.root.querySelectorAll("main > ul > li"));
    processNestedItems(list);
  }
}
