<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 col-md-8 px-0 mb-4" tabindex="0">
			<form role="form" class="oauth2-qq-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">[[oauth2-qq:General]]</h5>

			<div class="alert alert-info">
			[[oauth2-qq:alertInfo]]
			</div>
			
					<p class="lead" style="font-size: 1rem !important;">
					[[oauth2-qq:leadInfo]]
					</p>
					<div class="mb-3">
						<label class="form-label" for="setting-id">APP ID</label>
						<input type="text" id="setting-id" name="id" title="APP ID" class="form-control" placeholder="APP ID">
					</div>


					<div class="mb-3">
						<label class="form-label" for="setting-key">APP Key</label>
						<input type="text" id="setting-key" name="key" title="APP Key" class="form-control" placeholder="APP Key">
					</div>

					<div class="mb-3">
						<label class="form-label" for="setting-url">Callback URL</label>
						<input type="text" disabled  id="setting-url" name="url" title="Callback URL" class="form-control" placeholder="{baseUrl}/auth/qq/callback">
					</div>

					<div class="mb-3">
						<label class="form-label" for="setting-appCallbackUrl">APP Callback Schema</label>
						<input type="text" id="setting-appCallbackUrl" name="appCallbackUrl" title="APP Schema URL" class="form-control" placeholder="APP Schema URL">
					</div>

					<div class="form-check form-switch">
						<input type="checkbox" class="form-check-input" id="login" name="login">
						<label for="setting-login" class="form-check-label">[[oauth2-qq:enableLogin]]</label>
					</div>
				</div>


			</form>
		</div>

	</div>
</div>