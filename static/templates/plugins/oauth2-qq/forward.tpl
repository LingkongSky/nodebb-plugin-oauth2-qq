<div class="col-xs-12 col-sm-8 col-sm-offset-2 col-md-6 col-md-offset-3">
	<div class="panel panel-default">
		<div class="panel-heading">
			<h3 class="panel-title" style="top:20%;left: 50%;position: absolute;transform: translateX(-50%);">[[oauth2-qq:login]]</h3>
		</div>
		<div class="panel-body" style="top:25%;left: 50%;position: absolute;transform: translateX(-50%);">
			[[oauth2-qq:forward]]     
<a href="{appCallbackUrl}&code={code}" class="btn btn-primary btn-lg active" role="button">[[oauth2-qq:clickIt]]</a>
		</div>

        <script>
        window.location.replace("{appCallbackUrl}&code={code}");
        </script>
	</div>
</div>