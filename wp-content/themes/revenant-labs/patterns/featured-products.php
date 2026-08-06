<?php
/**
 * Title: Featured products
 * Slug: revenant-labs/featured-products
 * Categories: revenant-labs
 * Description: Product Collection grid with a designed empty state.
 *
 * @package RevenantLabs
 */

?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)"><!-- wp:group {"align":"wide","style":{"spacing":{"blockGap":"var:preset|spacing|30","margin":{"bottom":"var:preset|spacing|60"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"bottom"}} -->
<div class="wp-block-group alignwide" style="margin-bottom:var(--wp--preset--spacing--60)"><!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|20"}},"layout":{"type":"default"}} -->
<div class="wp-block-group"><!-- wp:paragraph {"className":"is-style-rl-meta","textColor":"muted-text","fontSize":"x-small"} -->
<p class="is-style-rl-meta has-muted-text-color has-text-color has-x-small-font-size">CATALOGUE</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">FEATURED RESEARCH MATERIALS</h2>
<!-- /wp:heading --></div>
<!-- /wp:group -->

<!-- wp:paragraph {"className":"rl-account-link","fontSize":"small"} -->
<p class="rl-account-link has-small-font-size"><a href="/catalogue/">View all →</a></p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:woocommerce/product-collection {"queryId":1,"query":{"perPage":4,"pages":1,"offset":0,"postType":"product","order":"desc","orderBy":"date","search":"","exclude":[],"inherit":false,"taxQuery":{},"isProductCollectionBlock":true,"featured":false,"woocommerceOnSale":false,"woocommerceStockStatus":["instock","outofstock","onbackorder"],"woocommerceAttributes":[],"woocommerceHandPickedProducts":[]},"tagName":"div","displayLayout":{"type":"flex","columns":4,"shrinkColumns":true},"align":"wide"} -->
<div class="wp-block-woocommerce-product-collection alignwide"><!-- wp:woocommerce/product-template -->
<!-- wp:woocommerce/product-image {"imageSizing":"thumbnail","isDescendentOfQueryLoop":true} /-->

<!-- wp:post-terms {"term":"product_cat","fontSize":"x-small","__woocommerceNamespace":"woocommerce/product-collection/product-collection"} /-->

<!-- wp:post-title {"level":3,"isLink":true,"fontSize":"large","__woocommerceNamespace":"woocommerce/product-collection/product-title"} /-->

<!-- wp:woocommerce/product-price {"isDescendentOfQueryLoop":true} /-->

<!-- wp:woocommerce/product-stock-indicator /-->

<!-- wp:revenant-labs/product-coa {"display":"badge"} /-->

<!-- wp:woocommerce/product-button {"isDescendentOfQueryLoop":true} /-->
<!-- /wp:woocommerce/product-template -->

<!-- wp:woocommerce/product-collection-no-results -->
<!-- wp:heading {"level":3,"textAlign":"center","fontSize":"x-large"} -->
<h3 class="wp-block-heading has-text-align-center has-x-large-font-size">The catalogue is being prepared</h3>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","textColor":"muted-text"} -->
<p class="has-text-align-center has-muted-text-color has-text-color">Research materials will be listed here once they are published. Documentation for each lot is added alongside the relevant product.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-rl-secondary"} -->
<div class="wp-block-button is-style-rl-secondary"><a class="wp-block-button__link wp-element-button" href="/contact/">CONTACT THE LAB</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
<!-- /wp:woocommerce/product-collection-no-results --></div>
<!-- /wp:woocommerce/product-collection --></div>
<!-- /wp:group -->
