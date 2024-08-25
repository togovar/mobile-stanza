import Stanza from "togostanza/stanza";

export default class MobileClinicalSignificance extends Stanza {
  async render() {
    const sparqlist = `${this.params.sparqlist}/api/mobile_clinvar?variant_id=${this.params.variant_id}`;
    const result = await fetch(sparqlist, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    }).then(res => {
      if (res.ok) return res.json();
      throw new Error(sparqlist + " returns status " + res.status);
    }).then(json => json).catch(e => ({ error: { message: e.message } }));
    result.title = result.results[0]?.title;
    result.review_status_stars = result.results[0]?.review_status_stars;
    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        result
      }
    });
  }
}
