$(document).ready(function(){
	orderTable = $("#orderTable").DataTable({
		dom: 'rtip',
		ajax: {
			url: '/api/orders',
			dataSrc: ''
		},
		columns: [
			{
				className: 'details-control',
				orderable: false,
				data: null,
				defaultContent: '<i class="fa fa-plus" style="color:#3c8dbc;" aria-hidden="true"></i>'
        	},
			{data: 'recievedOrderDate'},
			{data: 'customerName'},
			{data: 'productName'},
			{data: 'barcode'},
			{data: 'status'},
			{data: 'deliverDate'},
			{data: 'phone', visible: false},
			{data: 'remark', visible: false},
			{data: 'province', visible: false}
		],
		initComplete: function(){
			this.api().column(3).data().unique().each(function(productName){
				$('#searchProductName').append('<option value="' + productName + '">' + productName + '</option>')
			})
		}
	})
})

// -------------------- show info btn -------------------------------
$("#orderTable tbody").on("mouseenter", '.details-control', function(){
	$(this).css('cursor', 'pointer');
	$('i', this).css('color', 'red');
}).on("mouseleave", '.details-control', function(){
	$('i', this).css('color', '#3c8dbc');
})


$("#orderTable tbody").on('click', '.details-control', function(){
    var tr = $(this).closest('tr');
    var row = orderTable.row(tr);

    if(row.child.isShown()) {
		row.child.hide();
	}
    else {
		row.child(format(row.data())).show();
	}
    tr.toggleClass("shown");
})
// -------------------------------------------------------------------

// ------ searchForm ---------
$("#orderSearchForm").on('submit', function(e){e.preventDefault()});
$("#orderShowRow").on('change reset', function(){orderTable.page.len(this.value).draw()});
$("#searchCustomerName").on('keyup change reset', function(){orderTable.column(2).search(this.value).draw()});
$("#searchProductName").on('keyup change reset', function(){orderTable.column(3).search(this.value).draw()});
$("#searchTrackNumber").on('keyup change reset', function(){orderTable.column(4).search(this.value).draw()});
$("#searchStatus").on('keyup change reset', function(){orderTable.column(5).search(this.value).draw()});
$("#searchDeliverDate").on('keyup change reset', function(){orderTable.column(6).search(this.value).draw()});
$("#searchPhoneNumber").on('keyup change reset', function(){orderTable.column(7).search(this.value).draw()});
$("#searchRemark").on('keyup change reset', function(){orderTable.column(8).search(this.value).draw()});
$("#searchProvince").on('keyup change reset', function(){orderTable.column(9).search(this.value).draw()});
$("#clearSearchBtn").on('click', function(){$('searchCustomerName').val('')});
// ----------------------------


$('#updateOrderBtn').on('click', function(){
	$('#orderDisplay').fadeOut(500, function(){
		orderTable.clear().draw();
		$.get("/api/orders/update", function(orders){
			orderTable.rows.add(orders).draw();
			$('#orderDisplay').fadeIn(500);
		})
	})
});

// event listener at customersBtn
$("#customersBtn").on('click', function(){
	$('.content').fadeOut(1000, function(){
		$.get("/customers.ejs", function(template){
			var func = ejs.compile(template);
			$.get('/customers', function(customers){
				var html = func(customers);
				$('.content-wrapper').html(html);
				$('.content').fadeIn(1000);
			})
		})
	})
})

// 15/07 cancel ajax cause unsual behavior
// event listener at productsBtn
// $("#productsBtn").on('click', function(){
// 	$('.content').fadeOut(800, function(){
// 		$.get("/products.ejs", function(template){
// 			var func = ejs.compile(template);
// 			$.get("/products", function(products){
// 				var html = func(products);
// 				$(".content-wrapper").html(html);
// 				$('.contest').fadeIn(800);
// 			})
// 		})
// 	})
// })

// 15/07 cancel ajax from products to showproducts cause unsual behavior when click go back it will return to index.ejs instead of products.ejs
// ajax showProducts page
// $(".content-wrapper").on('click', '.showProducts', function(){
// 	var name = $(this).attr('name');
// 	$.get("/showProducts.ejs", function(template){
// 		var func = ejs.compile(template);
// 		$.get("/products/" + name, function(customers){
// 			var html = func(customers);
// 			$(".content-wrapper").html(html);
// 			$("#daterange-btn1").daterangepicker(
// 			{
// 				 ranges   : {
// 				 'Today'       : [moment(), moment()],
// 				 'Yesterday'   : [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
// 				 'Last 7 Days' : [moment().subtract(6, 'days'), moment()],
// 				 'Last 30 Days': [moment().subtract(29, 'days'), moment()],
// 				 'This Month'  : [moment().startOf('month'), moment().endOf('month')],
// 				 'Last Month'  : [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
// 				},
// 			 	startDate: moment().subtract(29, 'days'),
// 			 	endDate  : moment()
// 			 	},
// 			 	function (start, end) {
// 			 		$('#daterange-btn1 span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'))
// 			 	}
// 			 );
// 		})
		
// 	})
// })

// ajax showCustomers page
$(".content-wrapper").on('click', '.showCustomers', function(){
	var name = $(this).attr('name');
	$.get("/showCustomers.ejs", function(template){
		var func = ejs.compile(template);
		$.get("/customers/" + name, function(customers){
			var html = func(customers);
			$(".content-wrapper").html(html);
		})
	})
})

function format ( d ) {
    return '<table class="table table-hover table-striped" cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">'+
        '<tr>'+
            '<td>ชื่อลูกค้า:</td>'+
            '<td>' + d.customerName + '</td>'+
        '</tr>'+
		'<tr>' +
            '<td>เบอร์โทรศัพท์:  </td>'+
            '<td>' + d.phone + '</td>'+
        '</tr>'+
		'<tr>' +
			'<td>ที่อยู่:  </td>' +
			'<td>' + d.address + '</td>'+
		'</tr>' +
		 '<tr>' +
            '<td>ชื่อสินค้า:  </td>'+
            '<td>' + d.productName + '</td>'+
        '</tr>'+
		'<tr>' +
            '<td>หมายเหตุ:  </td>'+
            '<td>' + d.remark + '</td>'+
        '</tr>'+
        '<tr>' +
            '<td>จำนวนเงิน:  </td>'+
            '<td>' + d.amount + ' บาท</td>'+
        '</tr>'+
		 '<tr>' +
            '<td>Admin:  </td>'+
            '<td>' + d.admin + '</td>'+
        '</tr>'+
    '</table>';
}