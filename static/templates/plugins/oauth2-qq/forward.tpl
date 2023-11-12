<div class="col-xs-12 col-sm-8 col-sm-offset-2 col-md-6 col-md-offset-3">
	<div class="panel panel-default">
		<div class="panel-heading">
			<h3 class="panel-title">[[oauth2-qq:login]]</h3>
		</div>
		<div class="panel-body">
			[[oauth2-qq:forward]]
            <a href="{appCallbackUrl}&code={code}"></a>
		</div>

        <script>
        window.location.href = "{appCallbackUrl}&code={code}";
        </script>
	</div>
</div>