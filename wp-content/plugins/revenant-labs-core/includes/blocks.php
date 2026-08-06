<?php
/**
 * Block registration for COA display.
 *
 * Two server-rendered blocks:
 *  - revenant-labs/product-coa   — documentation for the product in context.
 *  - revenant-labs/coa-library   — the searchable Lab Reports listing.
 *
 * Both render only data that exists. Neither ever prints a label without a
 * value, and neither invents a default.
 *
 * @package RevenantLabsCore
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Add a block category so the blocks are easy to find in the inserter.
 *
 * @param array<int, array<string, mixed>> $categories Registered categories.
 * @return array<int, array<string, mixed>>
 */
function revenant_labs_core_block_category( array $categories ): array {
	array_unshift(
		$categories,
		array(
			'slug'  => 'revenant-labs',
			'title' => __( 'Revenant Labs', 'revenant-labs-core' ),
			'icon'  => null,
		)
	);

	return $categories;
}
add_filter( 'block_categories_all', 'revenant_labs_core_block_category' );

/**
 * Register the plugin's blocks.
 *
 * @return void
 */
function revenant_labs_core_register_blocks(): void {
	register_block_type(
		REVENANT_LABS_CORE_DIR . 'blocks/product-coa',
		array( 'render_callback' => 'revenant_labs_core_render_product_coa' )
	);

	register_block_type(
		REVENANT_LABS_CORE_DIR . 'blocks/coa-library',
		array( 'render_callback' => 'revenant_labs_core_render_coa_library' )
	);
}
add_action( 'init', 'revenant_labs_core_register_blocks' );

/**
 * Enqueue the small front-end stylesheet shared by both blocks.
 *
 * @return void
 */
function revenant_labs_core_block_styles(): void {
	$relative = 'assets/coa.css';
	$path     = REVENANT_LABS_CORE_DIR . $relative;

	if ( ! file_exists( $path ) ) {
		return;
	}

	$args = array(
		'handle' => 'revenant-labs-coa',
		'src'    => REVENANT_LABS_CORE_URL . $relative,
		'path'   => $path,
		'ver'    => (string) filemtime( $path ),
	);

	wp_enqueue_block_style( 'revenant-labs/product-coa', $args );

	$args['handle'] = 'revenant-labs-coa-library';
	wp_enqueue_block_style( 'revenant-labs/coa-library', $args );
}
add_action( 'init', 'revenant_labs_core_block_styles', 11 );

/**
 * Resolve the product ID a block is rendering against.
 *
 * @param array<string, mixed>  $block_context Block context.
 * @param WP_Block|null         $block         Block instance.
 * @return int
 */
function revenant_labs_core_context_product_id( array $block_context, ?WP_Block $block ): int {
	if ( $block instanceof WP_Block && ! empty( $block->context['postId'] ) ) {
		return (int) $block->context['postId'];
	}

	if ( ! empty( $block_context['postId'] ) ) {
		return (int) $block_context['postId'];
	}

	return (int) get_the_ID();
}

/**
 * Render the product COA block.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @param string               $content    Inner content (unused).
 * @param WP_Block|null        $block      Block instance.
 * @return string
 */
function revenant_labs_core_render_product_coa( array $attributes, string $content = '', ?WP_Block $block = null ): string {
	$product_id = revenant_labs_core_context_product_id( array(), $block );

	if ( $product_id <= 0 || 'product' !== get_post_type( $product_id ) ) {
		return '';
	}

	$record = revenant_labs_core_get_record( $product_id );

	// Nothing published for this lot: render nothing at all, never an empty label.
	if ( ! revenant_labs_core_is_published( $record ) ) {
		return '';
	}

	$display  = isset( $attributes['display'] ) ? (string) $attributes['display'] : 'summary';
	$doc_url  = revenant_labs_core_document_url( $record );
	$rows     = revenant_labs_core_metadata_rows( $record );
	$wrapper  = get_block_wrapper_attributes( array( 'class' => 'rl-coa rl-coa--' . sanitize_html_class( $display ) ) );
	$view_coa = __( 'View COA', 'revenant-labs-core' );

	ob_start();

	if ( 'badge' === $display ) {
		?>
		<p <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core. ?>>
			<span class="rl-coa__badge"><?php esc_html_e( 'COA available', 'revenant-labs-core' ); ?></span>
		</p>
		<?php

		return (string) ob_get_clean();
	}

	if ( 'summary' === $display ) {
		?>
		<div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core. ?>>
			<span class="rl-coa__badge"><?php esc_html_e( 'COA available', 'revenant-labs-core' ); ?></span>
			<?php if ( ! empty( $record['lot_number'] ) ) : ?>
				<span class="rl-coa__lot">
					<?php
					printf(
						/* translators: %s: lot number exactly as printed on the report. */
						esc_html__( 'Lot %s', 'revenant-labs-core' ),
						esc_html( (string) $record['lot_number'] )
					);
					?>
				</span>
			<?php endif; ?>
			<a class="rl-coa__link" href="<?php echo esc_url( $doc_url ); ?>" target="_blank" rel="noopener">
				<?php echo esc_html( $view_coa ); ?>
				<span class="screen-reader-text"><?php esc_html_e( '(opens in a new tab)', 'revenant-labs-core' ); ?></span>
			</a>
		</div>
		<?php

		return (string) ob_get_clean();
	}

	?>
	<div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core. ?>>
		<?php if ( ! empty( $rows ) ) : ?>
			<dl class="rl-coa__meta">
				<?php foreach ( $rows as $row ) : ?>
					<div class="rl-coa__row">
						<dt><?php echo esc_html( $row['label'] ); ?></dt>
						<dd><?php echo esc_html( $row['value'] ); ?></dd>
					</div>
				<?php endforeach; ?>
			</dl>
		<?php endif; ?>

		<p class="rl-coa__actions">
			<a class="rl-coa__link" href="<?php echo esc_url( $doc_url ); ?>" target="_blank" rel="noopener">
				<?php echo esc_html( $view_coa ); ?>
				<span class="screen-reader-text"><?php esc_html_e( '(opens in a new tab)', 'revenant-labs-core' ); ?></span>
			</a>
		</p>
	</div>
	<?php

	return (string) ob_get_clean();
}

/**
 * Query products that have a publishable COA record.
 *
 * @param array<string, mixed> $filters Optional product/lot/date filters.
 * @param int                  $limit   Maximum results.
 * @return array<int, int> Product IDs.
 */
function revenant_labs_core_query_reports( array $filters = array(), int $limit = 50 ): array {
	$keys = revenant_labs_core_meta_keys();

	$meta_query = array(
		'relation' => 'AND',
		array(
			'key'   => $keys['report_status'],
			'value' => 'published',
		),
	);

	if ( ! empty( $filters['lot'] ) ) {
		$meta_query[] = array(
			'key'     => $keys['lot_number'],
			'value'   => (string) $filters['lot'],
			'compare' => 'LIKE',
		);
	}

	if ( ! empty( $filters['from'] ) ) {
		$meta_query[] = array(
			'key'     => $keys['test_date'],
			'value'   => (string) $filters['from'],
			'compare' => '>=',
			'type'    => 'DATE',
		);
	}

	if ( ! empty( $filters['to'] ) ) {
		$meta_query[] = array(
			'key'     => $keys['test_date'],
			'value'   => (string) $filters['to'],
			'compare' => '<=',
			'type'    => 'DATE',
		);
	}

	$args = array(
		'post_type'              => 'product',
		'post_status'            => 'publish',
		'posts_per_page'         => $limit,
		'orderby'                => 'title',
		'order'                  => 'ASC',
		'no_found_rows'          => true,
		'ignore_sticky_posts'    => true,
		'update_post_term_cache' => false,
		'fields'                 => 'ids',
		// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- intentional: this listing is defined by report metadata.
		'meta_query'             => $meta_query,
	);

	if ( ! empty( $filters['product'] ) ) {
		$args['p'] = (int) $filters['product'];
	}

	$query = new WP_Query( $args );

	/** @var array<int, int> $ids */
	$ids = array_map( 'intval', (array) $query->posts );

	// A record is only listed when the document actually resolves.
	return array_values(
		array_filter(
			$ids,
			static function ( int $id ): bool {
				return revenant_labs_core_is_published( revenant_labs_core_get_record( $id ) );
			}
		)
	);
}

/**
 * Read and sanitise the library's filter parameters from the request.
 *
 * @return array<string, string|int>
 */
function revenant_labs_core_request_filters(): array {
	$filters = array();

	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only public filtering, no state change.
	if ( ! empty( $_GET['rl_product'] ) ) {
		$filters['product'] = absint( wp_unslash( $_GET['rl_product'] ) );
	}

	if ( ! empty( $_GET['rl_lot'] ) ) {
		$filters['lot'] = sanitize_text_field( wp_unslash( (string) $_GET['rl_lot'] ) );
	}

	foreach ( array( 'from' => 'rl_from', 'to' => 'rl_to' ) as $key => $param ) {
		if ( empty( $_GET[ $param ] ) ) {
			continue;
		}

		$value = sanitize_text_field( wp_unslash( (string) $_GET[ $param ] ) );

		if ( revenant_labs_core_is_valid_date( $value ) ) {
			$filters[ $key ] = $value;
		}
	}
	// phpcs:enable WordPress.Security.NonceVerification.Recommended

	return $filters;
}

/**
 * Render the COA library block.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @return string
 */
function revenant_labs_core_render_coa_library( array $attributes ): string {
	$limit        = isset( $attributes['limit'] ) ? max( 1, min( 200, (int) $attributes['limit'] ) ) : 20;
	$show_filters = ! empty( $attributes['showFilters'] );
	$filters      = $show_filters ? revenant_labs_core_request_filters() : array();

	$ids = revenant_labs_core_query_reports( $filters, $limit );

	// Whether any report exists at all, independent of the current filters.
	$has_any = empty( $filters ) ? ! empty( $ids ) : ! empty( revenant_labs_core_query_reports( array(), 1 ) );

	$wrapper = get_block_wrapper_attributes( array( 'class' => 'rl-coa-library' ) );

	ob_start();
	?>
	<div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core. ?>>
		<?php if ( $show_filters && $has_any ) : ?>
			<form class="rl-coa-library__filters" method="get" role="search">
				<p class="rl-coa-library__field">
					<label for="rl-lot"><?php esc_html_e( 'Lot number', 'revenant-labs-core' ); ?></label>
					<input type="search" id="rl-lot" name="rl_lot" value="<?php echo esc_attr( (string) ( $filters['lot'] ?? '' ) ); ?>" />
				</p>
				<p class="rl-coa-library__field">
					<label for="rl-from"><?php esc_html_e( 'Tested from', 'revenant-labs-core' ); ?></label>
					<input type="date" id="rl-from" name="rl_from" value="<?php echo esc_attr( (string) ( $filters['from'] ?? '' ) ); ?>" />
				</p>
				<p class="rl-coa-library__field">
					<label for="rl-to"><?php esc_html_e( 'Tested to', 'revenant-labs-core' ); ?></label>
					<input type="date" id="rl-to" name="rl_to" value="<?php echo esc_attr( (string) ( $filters['to'] ?? '' ) ); ?>" />
				</p>
				<p class="rl-coa-library__field rl-coa-library__field--actions">
					<button type="submit" class="wp-element-button"><?php esc_html_e( 'Filter reports', 'revenant-labs-core' ); ?></button>
					<?php if ( ! empty( $filters ) ) : ?>
						<a href="<?php echo esc_url( strtok( (string) wp_unslash( $_SERVER['REQUEST_URI'] ?? '/' ), '?' ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- escaped on output. ?>">
							<?php esc_html_e( 'Clear filters', 'revenant-labs-core' ); ?>
						</a>
					<?php endif; ?>
				</p>
			</form>
		<?php endif; ?>

		<?php if ( empty( $ids ) ) : ?>
			<div class="rl-coa-library__empty">
				<?php if ( $has_any ) : ?>
					<p><?php esc_html_e( 'No reports match these filters.', 'revenant-labs-core' ); ?></p>
				<?php else : ?>
					<p><?php esc_html_e( 'No analytical documentation has been published yet.', 'revenant-labs-core' ); ?></p>
					<p><?php esc_html_e( 'Reports appear here once they have been issued for a lot and published against the relevant product.', 'revenant-labs-core' ); ?></p>
				<?php endif; ?>
			</div>
		<?php else : ?>
			<ul class="rl-coa-library__list">
				<?php
				foreach ( $ids as $product_id ) :
					$record  = revenant_labs_core_get_record( $product_id );
					$rows    = revenant_labs_core_metadata_rows( $record );
					$doc_url = revenant_labs_core_document_url( $record );
					?>
					<li class="rl-coa-library__item">
						<h3 class="rl-coa-library__title">
							<a href="<?php echo esc_url( (string) get_permalink( $product_id ) ); ?>">
								<?php echo esc_html( (string) get_the_title( $product_id ) ); ?>
							</a>
						</h3>

						<?php if ( ! empty( $rows ) ) : ?>
							<dl class="rl-coa__meta">
								<?php foreach ( $rows as $row ) : ?>
									<div class="rl-coa__row">
										<dt><?php echo esc_html( $row['label'] ); ?></dt>
										<dd><?php echo esc_html( $row['value'] ); ?></dd>
									</div>
								<?php endforeach; ?>
							</dl>
						<?php endif; ?>

						<a class="rl-coa__link" href="<?php echo esc_url( $doc_url ); ?>" target="_blank" rel="noopener">
							<?php
							printf(
								/* translators: %s: product name. */
								esc_html__( 'View COA for %s', 'revenant-labs-core' ),
								esc_html( (string) get_the_title( $product_id ) )
							);
							?>
							<span class="screen-reader-text"><?php esc_html_e( '(opens in a new tab)', 'revenant-labs-core' ); ?></span>
						</a>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
	<?php

	return (string) ob_get_clean();
}
