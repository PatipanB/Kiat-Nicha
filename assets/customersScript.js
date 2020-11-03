$(document).ready(function(){
	$('#customerTable').DataTable({
		dom: 'rtip',
		initComplete: function(){
			var table = this;
			$("#customerShowRow").on('change reset', function(){table.api().page.len(this.value).draw()});
			$("#searchCustomerPhone").on('change keyup reset', function(){table.api().column(2).search(this.value).draw()});
			$("#searchCustomerName").on('change keyup reset', function(){table.api().column(0).search(this.value).draw()});
		}
	})
})