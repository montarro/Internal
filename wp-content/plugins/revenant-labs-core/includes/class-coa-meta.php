<?php
/**
 * Certificate-of-analysis product metadata.
 *
 * Adds an optional COA panel to the WooCommerce product editor. Every field is
 * optional, nothing is pre-filled, and a report only becomes public when it has
 * both a document and an explicit "Published" status.
 *
 * @package RevenantLabsCore
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers and persists COA metadata for products.
 */
final class Revenant_Labs_COA_Meta {

	private const NONCE_ACTION = 'revenant_labs_save_coa';
	private const NONCE_NAME   = 'revenant_labs_coa_nonce';

	/**
	 * Hook everything up.
	 *
	 * @return void
	 */
	public static function init(): void {
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_box' ) );
		add_action( 'save_post_product', array( __CLASS__, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_media' ) );
	}

	/**
	 * Register the meta box on the product editor.
	 *
	 * @return void
	 */
	public static function add_meta_box(): void {
		if ( ! post_type_exists( 'product' ) ) {
			return;
		}

		add_meta_box(
			'revenant-labs-coa',
			__( 'Certificate of analysis', 'revenant-labs-core' ),
			array( __CLASS__, 'render_meta_box' ),
			'product',
			'normal',
			'default'
		);
	}

	/**
	 * The media library picker needs wp.media on the product screen.
	 *
	 * @param string $hook Current admin page.
	 * @return void
	 */
	public static function enqueue_media( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen || 'product' !== $screen->post_type ) {
			return;
		}

		wp_enqueue_media();
		wp_enqueue_script(
			'revenant-labs-coa-admin',
			REVENANT_LABS_CORE_URL . 'assets/coa-admin.js',
			array( 'jquery' ),
			REVENANT_LABS_CORE_VERSION,
			true
		);
	}

	/**
	 * Render the COA fields.
	 *
	 * @param WP_Post $post Product being edited.
	 * @return void
	 */
	public static function render_meta_box( WP_Post $post ): void {
		$record   = revenant_labs_core_get_record( $post->ID );
		$statuses = revenant_labs_core_report_statuses();
		$doc_url  = revenant_labs_core_document_url( $record );

		wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

		?>
		<p class="description">
			<?php esc_html_e( 'All fields are optional. Enter only what appears on the report issued for this lot — never an estimate, a target or a placeholder. A report is shown publicly only when a document is attached and the status is set to Published.', 'revenant-labs-core' ); ?>
		</p>

		<table class="form-table" role="presentation">
			<tbody>
			<tr>
				<th scope="row">
					<label for="revenant-labs-coa-attachment"><?php esc_html_e( 'COA document', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="hidden"
						id="revenant-labs-coa-attachment"
						name="revenant_labs_coa_attachment_id"
						value="<?php echo esc_attr( (string) ( $record['attachment_id'] ?? '' ) ); ?>"
					/>
					<button type="button" class="button" id="revenant-labs-coa-select">
						<?php esc_html_e( 'Select from media library', 'revenant-labs-core' ); ?>
					</button>
					<button type="button" class="button-link" id="revenant-labs-coa-clear">
						<?php esc_html_e( 'Remove', 'revenant-labs-core' ); ?>
					</button>
					<span id="revenant-labs-coa-filename" class="description">
						<?php
						if ( ! empty( $record['attachment_id'] ) ) {
							echo esc_html( (string) get_the_title( (int) $record['attachment_id'] ) );
						}
						?>
					</span>
					<p class="description">
						<?php esc_html_e( 'Upload the report to the media library so the document stays with the site. Documents are served from the media library, not from an external host.', 'revenant-labs-core' ); ?>
					</p>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-coa-url"><?php esc_html_e( 'Document URL (fallback)', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="url"
						class="regular-text code"
						id="revenant-labs-coa-url"
						name="revenant_labs_coa_document_url"
						value="<?php echo esc_attr( (string) ( $record['document_url'] ?? '' ) ); ?>"
					/>
					<p class="description">
						<?php esc_html_e( 'Only use this if the report cannot be added to the media library. The media library attachment takes precedence.', 'revenant-labs-core' ); ?>
					</p>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-lot"><?php esc_html_e( 'Lot number', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="text"
						class="regular-text"
						id="revenant-labs-lot"
						name="revenant_labs_lot_number"
						value="<?php echo esc_attr( (string) ( $record['lot_number'] ?? '' ) ); ?>"
					/>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-batch"><?php esc_html_e( 'Batch number', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="text"
						class="regular-text"
						id="revenant-labs-batch"
						name="revenant_labs_batch_number"
						value="<?php echo esc_attr( (string) ( $record['batch_number'] ?? '' ) ); ?>"
					/>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-lab"><?php esc_html_e( 'Testing laboratory', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="text"
						class="regular-text"
						id="revenant-labs-lab"
						name="revenant_labs_testing_lab"
						value="<?php echo esc_attr( (string) ( $record['testing_lab'] ?? '' ) ); ?>"
					/>
					<p class="description">
						<?php esc_html_e( 'Enter the laboratory name exactly as it appears on the report, spelled as the laboratory spells it.', 'revenant-labs-core' ); ?>
					</p>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-test-date"><?php esc_html_e( 'Test date', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="date"
						id="revenant-labs-test-date"
						name="revenant_labs_test_date"
						value="<?php echo esc_attr( (string) ( $record['test_date'] ?? '' ) ); ?>"
					/>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-purity"><?php esc_html_e( 'Result as reported', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<input
						type="text"
						class="regular-text"
						id="revenant-labs-purity"
						name="revenant_labs_purity_result"
						value="<?php echo esc_attr( (string) ( $record['purity_result'] ?? '' ) ); ?>"
					/>
					<p class="description">
						<?php esc_html_e( 'Transcribe the result exactly as printed on the report. Do not round, restate or generalise it, and do not enter a figure for a lot that has not been tested.', 'revenant-labs-core' ); ?>
					</p>
				</td>
			</tr>

			<tr>
				<th scope="row">
					<label for="revenant-labs-status"><?php esc_html_e( 'Report status', 'revenant-labs-core' ); ?></label>
				</th>
				<td>
					<select id="revenant-labs-status" name="revenant_labs_report_status">
						<?php foreach ( $statuses as $value => $label ) : ?>
							<option value="<?php echo esc_attr( $value ); ?>" <?php selected( (string) ( $record['report_status'] ?? '' ), $value ); ?>>
								<?php echo esc_html( $label ); ?>
							</option>
						<?php endforeach; ?>
					</select>
					<p class="description">
						<?php esc_html_e( 'Only "Published" makes the report visible on the product page and in the Lab Reports library, and only when a document is attached.', 'revenant-labs-core' ); ?>
					</p>
				</td>
			</tr>
			</tbody>
		</table>

		<?php if ( '' !== $doc_url ) : ?>
			<p>
				<a href="<?php echo esc_url( $doc_url ); ?>" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Open the currently attached document', 'revenant-labs-core' ); ?>
				</a>
			</p>
		<?php endif; ?>
		<?php
	}

	/**
	 * Validate, sanitise and persist submitted COA data.
	 *
	 * @param int     $post_id Product ID.
	 * @param WP_Post $post    Product object.
	 * @return void
	 */
	public static function save( int $post_id, WP_Post $post ): void {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( 'product' !== $post->post_type ) {
			return;
		}

		// The panel is not rendered on quick edit / bulk edit, so do nothing there.
		if ( ! isset( $_POST[ self::NONCE_NAME ] ) ) {
			return;
		}

		$nonce = sanitize_text_field( wp_unslash( (string) $_POST[ self::NONCE_NAME ] ) );

		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$keys = revenant_labs_core_meta_keys();

		self::save_field( $post_id, $keys['attachment_id'], 'revenant_labs_coa_attachment_id', 'attachment' );
		self::save_field( $post_id, $keys['document_url'], 'revenant_labs_coa_document_url', 'url' );
		self::save_field( $post_id, $keys['lot_number'], 'revenant_labs_lot_number', 'text' );
		self::save_field( $post_id, $keys['batch_number'], 'revenant_labs_batch_number', 'text' );
		self::save_field( $post_id, $keys['testing_lab'], 'revenant_labs_testing_lab', 'text' );
		self::save_field( $post_id, $keys['test_date'], 'revenant_labs_test_date', 'date' );
		self::save_field( $post_id, $keys['purity_result'], 'revenant_labs_purity_result', 'text' );
		self::save_field( $post_id, $keys['report_status'], 'revenant_labs_report_status', 'status' );
	}

	/**
	 * Sanitise one submitted field and store it, deleting it when emptied.
	 *
	 * @param int    $post_id    Product ID.
	 * @param string $meta_key   Meta key to write.
	 * @param string $input_name Name of the submitted field.
	 * @param string $type       Sanitisation type.
	 * @return void
	 */
	private static function save_field( int $post_id, string $meta_key, string $input_name, string $type ): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified by the caller.
		$raw = isset( $_POST[ $input_name ] ) ? wp_unslash( $_POST[ $input_name ] ) : '';

		if ( ! is_scalar( $raw ) ) {
			$raw = '';
		}

		$raw   = (string) $raw;
		$value = '';

		switch ( $type ) {
			case 'attachment':
				$id = absint( $raw );

				// Only accept an ID that is a real attachment on this site.
				$value = ( $id > 0 && 'attachment' === get_post_type( $id ) ) ? (string) $id : '';
				break;

			case 'url':
				$value = '' === trim( $raw ) ? '' : esc_url_raw( trim( $raw ) );
				break;

			case 'date':
				$trimmed = trim( $raw );
				$value   = revenant_labs_core_is_valid_date( $trimmed ) ? $trimmed : '';
				break;

			case 'status':
				$statuses = revenant_labs_core_report_statuses();
				$value    = array_key_exists( $raw, $statuses ) ? $raw : '';
				break;

			case 'text':
			default:
				$value = sanitize_text_field( $raw );
				break;
		}

		if ( '' === $value ) {
			delete_post_meta( $post_id, $meta_key );

			return;
		}

		update_post_meta( $post_id, $meta_key, $value );
	}
}

Revenant_Labs_COA_Meta::init();
