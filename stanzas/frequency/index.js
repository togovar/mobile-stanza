import Stanza from "togostanza/stanza";
import { hierarchy } from 'd3-hierarchy';
import { DATASETS } from "@/lib/constants";
import { findTopParent, findParent, updateParentClass } from "@/lib/frequency";

export default class MobileFrequency extends Stanza {
  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    // database icon
    this.importWebFontCSS("https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");

    const { "data-url": urlBase, assembly, variant_id } = this.params;
    const dataURL = `${urlBase}/search?quality=0&term=${variant_id}&expand_dataset`
    let resultObject = [];
    let currentLayer1;
    let hasHemizygote = false;
    let uniqueIdCounter = 0;

    function addIdsToDataNodes(dataNodes, currentDepth = 0) {
      return dataNodes.map((node) => {
        // 各ノードに一意のIDを設定
        const newNode = {
          ...node,
          id: `${uniqueIdCounter++}`,
          depth: currentDepth
        };

        // 子ノードがある場合は再帰的に処理
        if (newNode.children && newNode.children.length > 0) {
          newNode.children = addIdsToDataNodes(newNode.children, currentDepth + 1);
        }
        return newNode;
      });
    }

    function prepareData() {
      const data = DATASETS
      const dataWithIds = addIdsToDataNodes(data);
      const hierarchyData = hierarchy({
        id: '-1',
        label: 'root',
        value: '',
        children: dataWithIds,
      });
      return hierarchyData;
    }
    const preparedDatasets = Object.values(prepareData().data.children);

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
        const frequencyData = frequenciesDatasets?.find((x) => x.source === datum.value);
        if (frequencyData) {
          // ID
          frequencyData.id = datum.id
          // 深さ
          frequencyData.depth = datum.depth;

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
            frequencyData.dataset = findTopParent(preparedDatasets, datum.id).label;
          }

          // Population label
          if (["gem_j_wga", "jga_wes", "tommo", "hgvd"].includes(datum.value)) {
            frequencyData.label = "Japanese";
          } else if (["jga_wgs", "jga_snp", "ncbn", "gnomad_genomes", "gnomad_exomes"].includes(datum.value)) {
            frequencyData.label = "Total";
          } else {
            frequencyData.label = datum.label;
          }

          // 数値をロケール形式の文字列に変換する関数
          const localeString = (v) => v !== undefined ? parseInt(v).toLocaleString() : null;
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

          if (!hasHemizygote && (frequencyData.hemi_alt || frequencyData.hemi_ref)) {
            hasHemizygote = true;
          }

          const frequency = parseFloat(frequencyData.af);
          frequencyData.frequency = parseFloat(frequency).toExponential(2);
          frequencyData.indicator = frequency < 0.0001 ? 1 : frequency < 0.001 ? 2 : frequency < 0.01 ? 3 : frequency < 0.05 ? 4 : frequency < 0.5 ? 5 : 6;

          // JGA-SNPの場合 見出しのdataがないため追加
          if (frequencyData.dataset === "JGA-SNP") {
            if (currentLayer1 !== frequencyData.label) {
              if (frequencyData.depth === 2 && currentLayer1 !== findParent(preparedDatasets, datum.id).label) {
                let data = {
                  dataset: frequencyData.dataset,
                  depth: 1,
                  label: findParent(preparedDatasets, datum.id).label,
                  source: `${frequencyData.dataset}-title`,
                  id: findParent(preparedDatasets, datum.id).id,
                  has_child: true
                };
                resultObject = [...resultObject, data];
                currentLayer1 = findParent(preparedDatasets, datum.id).label;
              }
            }
          }

          resultObject = [...resultObject, frequencyData];
        }

        // Recursively search children
        if (datum.children) {
          datum.children.forEach(searchData);
        }
      };

      preparedDatasets.forEach(searchData);

      // クラス名を更新
      updateParentClass(preparedDatasets, resultObject);

      console.log(resultObject);

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
        // depth0 以外の要素から h2 要素を削除
        if (list.dataset.depth !== "0") {
          list.querySelector("h2").remove();

          // datasetがJGA-SNPかつdepthが1のとき allele-count 要素を削除
          if (list.dataset.dataset === "JGA-SNP" && list.dataset.depth === "1") {
            list.querySelector(".allele-count").remove();
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
      let depth1Items = [];
      let depth2Items = [];
      let depth3Items = [];
      let subLayerItems = [];

      const appendLayer3ToLayer2 = () => {
        if (depth3Items.length > 0) {
          appendSubset(depth2Items.at(-1), depth3Items);
          depth3Items = [];
        }
      };

      const appendLayer2ToLayer1 = () => {
        if (depth2Items.length > 0) {
          appendSubset(depth1Items.at(-1), depth2Items);
          depth2Items = [];
        }
      };

      const appendLayer2ToSubLayer = () => {
        if (depth2Items.length > 0) {
          appendSubset(subLayerItems.at(-1), depth2Items);
          depth2Items = [];
        }
      };

      const appendSubLayerToTotal = () => {
        if (subLayerItems.length > 0 && currentTotalItem) {
          appendSubset(currentTotalItem, subLayerItems);
          subLayerItems = [];
        }
      };

      const appendLayer1ToTotal = () => {
        if (depth1Items.length > 0 && currentTotalItem) {
          appendSubset(currentTotalItem, depth1Items);
          depth1Items = [];
        }
      };

      items.forEach((item) => {
        if (item.dataset.depth === "0") {
          appendLayer3ToLayer2();
          if (subLayerItems.length > 0) {
            appendLayer2ToSubLayer();
            appendSubLayerToTotal();
          } else {
            appendLayer2ToLayer1();
            appendLayer1ToTotal();
          }
          currentTotalItem = item;

        } else if (item.dataset.dataset === "JGA-SNP" && item.dataset.depth === "1") {
          appendLayer3ToLayer2();
          appendLayer2ToSubLayer();
          subLayerItems.push(item);

        } else if (item.dataset.depth === "1") {
          appendLayer3ToLayer2();
          appendLayer2ToLayer1();
          depth1Items.push(item);

        } else if (item.dataset.depth === "2") {
          appendLayer3ToLayer2();
          depth2Items.push(item);

        } else if (item.dataset.depth === "3") {
          depth3Items.push(item);
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
