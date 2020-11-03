// ALL SETUP
var bodyParser     = require("body-parser");
var mongoose       = require("mongoose");
var request        = require('request');
var fs             = require('fs');
var express        = require("express");
var multer         = require('multer');
var mongoXlsx      = require('mongo-xlsx');
var methodOverride = require("method-override")
// var semanticUi  = require("semantic-ui")
var app            = express();

var storage = multer.diskStorage({
	//set where to save file from darg and drop
 	destination: function (req, file, cb) {
		cb(null, 'uploads/');
 	},
	//set name of save files
 	filename: function (req, file, cb) {
		cb(null, file.originalname);
  	}
})

var upload = multer({ storage: storage })

mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect("mongodb://localhost/orders");

app.use(bodyParser.urlencoded({extended: true}));
app.use('/bower_components', express.static('./node_modules/admin-lte/bower_components'));
app.use('/node_modules', express.static('./node_modules'));
app.use('/dist', express.static('./node_modules/admin-lte/dist'));
app.use('/stylesheets', express.static('./public/stylesheets'));
app.use('/assets', express.static('./assets'));
app.use(methodOverride("_method"))
app.set("view engine", "ejs");

// SET SCHEMAS

//save product name to use find in orders dbs
var productSchema = new mongoose.Schema({
	productName: String,
	price: Number
});

var orderSchema = new mongoose.Schema({
	productName: String,
	social: String,
	customerName: String,
	barcode: String,
	status: String,
	address: String,
	province: String,
	phone: String,
	deliverDate: String,
	remark: String,
	amount: Number,
	admin: String,
	payment: String,
	recievedOrderDate: String
});

var tokenSchema = new mongoose.Schema({
	expire: String,	
	token: String
});

//save customer name to use find in orders dbs
var customerSchema = new mongoose.Schema({
	customerName: String,
	phone: String,
	address: String
});

var x = new Date().toDateString();
console.log(enToThDate(x));

// ALL MONGOOSE MODELS
var Customer = mongoose.model("Customer", customerSchema);
var Product = mongoose.model("Product", productSchema);
var Order = mongoose.model("Order", orderSchema);
var Token = mongoose.model("Token", tokenSchema);

const keyModel = [
	"poCode", "trackNumber", "barcode", "productName", "customerName",
	"address", "remark", "phone", "amount", "admin", "shipping", "payment"
]

// for converting excel to obj
const valModel = [
	'ติดตามการสั่งซื้อ | ห้างหุ้นส่วนจำกัดเกียรติณิชา', "_no_header_at_col_1", 
	"_no_header_at_col_2", "_no_header_at_col_3", 
	"_no_header_at_col_4", "_no_header_at_col_5", 
	"_no_header_at_col_6", "_no_header_at_col_7",
	"_no_header_at_col_8", "_no_header_at_col_9",
	"_no_header_at_col_10", "_no_header_at_col_11"
]

// SETUP FOR TH POST API
const getTokenUrl = "https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token";
const getItemUrl = "https://trackapi.thailandpost.co.th/post/api/v1/track";
const staticToken = 'QkKcLHFgHKQLNDADJMBsCUJCMABLS$NdWSGRT_GrIfRnBkQ*VoXZDJCbNFPiDJQ&M.HoLNECUCGCNU/ItToE5CdTF2M;A+WqKw';
var token = null; // retrieved from db when app.js is ran

updateToken();
// getTokenFromDb();

app.get("/test", function(req, res){
	res.render("test");
})

app.get("/testmongo", function(req, res){
	Order.find({$and: [{recievedOrderDate: {$eq: "ก.ค." } }] } ).exec(function (err, orders) {
    	orders.forEach(function(order) {
			console.log(order.recievedOrderDate);
		})
	})
})

app.get("/testajax", function(req, res){
	res.sendFile("/workspace/wdb/Kiat-Nicha/views/testajax.html");
})

// update orders and send back
app.get("/api/orders/update", function(req, res){
	updateOrder(res);
})

app.get('api/remark/:productName', function(req, res){
	console.log(req.params.productName);
	getRemark(req.params.productName, res);
})

app.get("/api/orders", function(req, res){
	Order.find({}, (err, orders) => res.send(orders));
})

// search and return matched [orders]
app.get("/api/orders/search", function(req, res){
	// console.log('req', req.query);
	searchFromDb(req.query, res);
})

app.post("/file-upload", upload.any(), function(req, res){
	var xlsx  = './uploads/' + req.files[0].filename;
	mongoXlsx.xlsx2MongoData(xlsx, null, function(err, data) {
		formatXlsx(data); // format xlsx data and add to db
		res.redirect("/");
	});
});

app.get("/", function(req, res){
	var customers = {} // {name: amount, name2: amount2, ..}
	var topCustomers = []
	
		Order.find(function(err, orders){
			orders.forEach(function(order){
				//console.log(order.customerName)
				if(customers[order.customerName] != undefined){
					customers[order.customerName] += order.amount
				}else{
					customers[order.customerName] = order.amount
				}
			})
			sortedCustomers = Object.keys(customers).sort(function(a,b){return customers[b] - customers[a]})
			for(var i = 0 ; i < 3; i++){
				topCustomers.push(sortedCustomers[i])
			}
			//console.log(topCustomers)
			res.render("index", {topCustomers: topCustomers});
		});

	
})

app.get("/customers.ejs", function(req, res){
	res.sendFile("/workspace/wdb/Kiat-Nicha/views/customers.ejs");
})

// 15/07 cancel ajax
// app.get("/products.ejs", function(req, res){
// 	res.sendFile("/workspace/wdb/Kiat-Nicha/views/products.ejs");
// })

app.get("/showCustomers.ejs", function(req, res){
	res.sendFile("/workspace/wdb/Kiat-Nicha/views/showCustomers.ejs");
})

// 15/07 cancel ajax
// app.get("/showProducts.ejs", function(req, res){
// 	res.sendFile("/workspace/wdb/Kiat-Nicha/views/showProducts.ejs");
// })

// 15/07 cancel ajax
app.get("/products", function(req, res){
	Product.find({}, function(err, products){
		if(err) console.log("Error INDEX Route", err);
		else res.render("products", {products: products});
	})
})

app.get("/customers", function(req, res){
	var list = []; // [product, orders]
	Customer.find({}, function(err, customers){
		res.send({customers: customers});
	})
})

// function getInfo(productName){
// 	return new Promise((resolve, reject) => {
// 		var list = []; // [product, countRemark(sorted), orders, countAmount, ]
// 		var countRemarks = {}; // {ความดัน:12, เบาหวาน:2, ...}
// 		var sortedCountRemarks;
// 		var countAmountOfDate = {}; // // {Date: amount, ...}
		
// 		Product.findOne({productName: productName}, function(err, product){
// 			Order.find({productName: productName}, function(err, orders){
// 				orders.forEach(function(order){

// 					order.remark.split(' ').forEach(function(remark){ // remark in each order
// 						if(countRemarks[remark] == undefined) countRemarks[remark] = 1;
// 						else countRemarks[remark]++;
// 					})
					
// 					sortedCountRemarks = Object.entries(countRemarks).sort((a, b) => b[1] - a[1]); // sort remarks from max to min

// 					if(countAmountOfDate[order.recievedOrderDate] == undefined) countAmountOfDate[order.recievedOrderDate] = order.amount;
// 					else countAmountOfDate[order.recievedOrderDate] += order.amount;

// 					list.push(product, sortedCountRemarks, orders, countAmountOfDate);
// 					resolve(list); // return list
// 				})
// 			})
// 		})
// 	})
// }

// 15/07 cancel ajax
app.get("/products/:productName", function(req, res){
	// {ความดัน:12, เบาหวาน:2, ...}
	// {Date: amount, ...}
	// {price: numOfAmount}
	// {กลับมาซื้อ1ครั้ง: ..คน , ..}
	// {list: [{}, {}, ..]}
	
	var remarks = [];
	var countRemarks = [];
	var words = []; //[ {label: ความดัน, count:12}, {label: เบาหวาน, count:2} , ... ]
	var countAmount = {};
	var numOfAmount = {};
	var list = []; // [product, remarks, orders, countAmount] <-- countAmount = {date: amount}
	
	Product.findOne({productName: req.params.productName}, (err, product) => {
		list.push(product);
		Order.find({productName: req.params.productName}, (err, orders) => {
			orders.forEach(function(order){
				
				if(countAmount[order.recievedOrderDate] != undefined){
					countAmount[order.recievedOrderDate] += order.amount;
				} else {
					countAmount[order.recievedOrderDate] = order.amount;
				}
				
				if(numOfAmount[order.amount] != undefined){
					numOfAmount[order.amount] += 1 
				}else{ 
					numOfAmount[order.amount] = 1
				}
				
				var remarkSplitted = order.remark.split(' '); // [remark, remark ,remark ,..]
				remarkSplitted.forEach(function(remark){
					if(remark != undefined){
						if(remarks.indexOf(remark) == -1 && remark != '-'){
							remarks.push(remark);
							countRemarks.push(1);
						}
						else countRemarks[remarks.indexOf(remark)] += 1;
					}
				})
			})
			for(var i = 0; i < remarks.length; i++) {
				words.push({labels: remarks[i], count: countRemarks[i]}); //[ {label: remark, count: number} , ... ]
			}
			list.push(sortRemark(words));
			list.push(orders);
			var sortedCountAmount = sortObjectByKey(countAmount);
			list.push(sortedCountAmount);
			list.push(numOfAmount);
			res.render("showProducts", {list: list});
		}) 
	})
	
})

//!!!!!!incomplete!!!!!! //call two callback cause overlape sometimes
app.get("/customers/:customerName", function(req, res){
	var list = []; // [product, orders]
	Customer.findOne({customerName: req.params.customerName}, (err, customer) => {
		list.push(customer);
		Order.find({customerName: req.params.customerName }, (err, orders) => {
			list.push(orders);
			res.send({list: list});
		})
	})
})

// SHOW ROUTE
app.get("/order/:id", function(req, res){
	Order.findById(req.params.id, function(err, order){
		if(err){
			res.redirect("/");
		}else{
			res.render("show", {order: order});
		}
	})
})


// EDIT ROUTE
app.get("/order/:id/edit", function(req, res){
	Order.findById(req.params.id, function(err, order){
		if(err){
			res.redirect("/");
		}else{
			//console.log(order)
			res.render("edit", {order: order});
		}
	});
});

// UPDATE ROUTE
app.put("/order/:id", function(req, res){
	var id = req.params.id;
	var newOrder = req.body;
	Order.updateOne({_id: id}, newOrder, function(err, updated){
		if(err){
			res.redirect("/");
		}else{
			res.redirect("/order/" + id)
		}
	})
	
});


//THIS ROUTE CAN GET BECAUSE HAVE SHOW ROUTE HAVE THE SAVE GET METHOD
// DELETE ROUTE
app.get("/order/:id", function(req, res){
	//destroy blog
	console.log("id:", req.params.id);
	Order.findByIdAndRemove(req.params.id, function(err){
	   if(err){
		   res.redirect("/");
	   } else {
		   res.redirect("/");
	   }
	})
	//redirect somewhere
});

app.get("*", function(req, res){
	// console.log("any route");
	Order.find({}, (err, orders) => {
		if(err) console.log("Err GET *", err);
		res.redirect('/');
	})
})

app.listen(3000, function() { 
	console.log('\033[32mServer Starting!!!\033[0m'); 
});


// return obj
// function getRemark(productName, res){
// 	var remarks = [];
// 	var countRemarks = [];
// 	Order.find({productName: productName}, function(err, orders){
// 		orders.forEach(function(order){
// 			var remarkSplitted = order.remark.split(' '); // [remark, remark ,remark ,..]
// 			remarkSplitted.forEach(function(remark){
// 				if(remark.indexOf(remark) == -1){
// 					if(remarks != '-') {
// 						remarks.push(remark);
// 						countRemarks.push(1);
// 					}
// 					else countRemarks[remarks.indexOf(remark)] += 1;
// 				}
// 			})
// 		})
// 		res.send({labels: remarks, data: countRemarks});
// 	})
// }

function sortObjectByKey(obj){
	var sortedObj = {};
	Object.keys(obj).sort().forEach(function(key){
		sortedObj[key] = obj[key];
	})
	return sortedObj;
}

function searchFromDb(obj, res){
	Order.find(makeSearchModel(obj), (err, orders) => {
		res.send(orders);
	})
	
}

function makeSearchModel(obj){
	var model = {};
	if(obj.status != '') model.status = obj.status;
	if(obj.remark != '' ) model.remark = obj.remark;
	if(obj.customerName != '') model.customerName = obj.customerName;
	if(obj.productName != '') model.productName = obj.productName;
	if(obj.province != '') model.province = obj.province;
	if(obj.phoneNumber != '') model.phoneNumber = obj.phoneNumber;
	if(obj.datetimepicker != '' ) model.datetimepicker = obj.deliverDate;
	return model;
}

// return the latest process Obj
// [barcode(String), status(String), deliverDate(String)]  <-- List
function getLatestProcess(processList){
	if(processList == undefined) return {};
	var n = processList.length;
	if(n > 0){
		return processList[n-1];
	}else{ // process is empty
		return {};
	}
}

function updateToken(){
	var model ={
			endpoint: getTokenUrl,
			url: getTokenUrl,
			"rejectUnauthorized": false, 
			method: 'POST',
			headers: 
			{
				'Authorization': "Token " + staticToken,
				'Content-Type': 'application/json'
			}
		}
	request(model, (err, response, body) => {
		var parsedData = JSON.parse(body);
		Token.collection.drop();
		Token.create(parsedData, (err, savedData) => {
			if(err) consolse.log("Err updateToken", err);
			else console.log("UPDATED", savedData.token);
			getTokenFromDb();
		})
	})
}

// take list of barcodes
function makeGetItemModel(barcode){
	var model = {
			endpoint: getItemUrl,
			url: getItemUrl,
			"rejectUnauthorized": false, 
			method: 'POST',
			headers:
			{
				'Authorization': "Token " + token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(
			{
				"status":"all",
				"language":"TH",
				"barcode": barcode
			})
		};
	return model;
}

// set value of "token" to be valid
function getTokenFromDb(){
	Token.findOne({}, (err, _token) => {
		token = _token.token;
	})
}

// input is a list of obj
function formatXlsx(list){
	// skip the first obj
	for(var i=1; i < list.length; i++){
		var newFormatObj = {};
		for(var j=0; j < keyModel.length; j++){
			if(list[i][valModel[j]] != undefined){
				newFormatObj[keyModel[j]] = String(list[i][valModel[j]]);
			}else{
				newFormatObj[keyModel[j]] = "-";
			}
		}
		var extracted = extractInfo(newFormatObj);
		
		addOrderToDb(extracted);		
	}
}

// obj order
// currently add one order at a time
function addOrderToDb(order){
	var barcode = order.barcode;
	thPostRequest([barcode]).then(parsedBody => {
		var processList = parsedBody.response.items[barcode];
		var latestProcess = getLatestProcess(processList);

		order.status = latestProcess.status_description == null ? "-": latestProcess.status_description;
		order.deliverDate = latestProcess.delivery_datetime == null ? "-": numberToThDate(latestProcess.delivery_datetime);

		Order.create(order);
		Customer.create(order);
		Product.create(order);
	})
}

// return promise
// make request to THpost api
function thPostRequest(barcode){
    return new Promise((resolve, reject) => {
        request(makeGetItemModel(barcode), function(err, response, body){
			if(err) console.log("Err thpost req at barcode:", barcode, err);
			else{
				var parsedBody = JSON.parse(body);
				if(parsedBody.status == true) resolve(parsedBody);
				else reject(new Error(parsedBody));
			}
        })
    })
}

function extractInfo(obj){
	var extractedObj = {};
	
	// customerName part
	var i = 0;
	var j = 0;
	var customerNameSplitted = obj.customerName.split(' ');
	var customerNameLength = customerNameSplitted.length;
	for(i=0; i < customerNameLength; i++){
		if(customerNameSplitted[i] == 'Social') break;
	}
	var namePortion = customerNameSplitted.slice(0, i).join(' ');
	for(j=0; j < namePortion.length; j++){
		if(namePortion[j] == '.') break;
	}
	
	var n = obj.address.split(' ').length;
	
	extractedObj.customerName = namePortion.slice(j+1, namePortion.length);
	extractedObj.social = customerNameSplitted.slice(i+2, customerNameLength-4).join(' ');
	extractedObj.recievedOrderDate = customerNameSplitted.slice(customerNameLength-4, customerNameLength-1).join(' ');
	extractedObj.productName = obj.productName;
	extractedObj.poCode = obj.poCode;
	extractedObj.trackNumber = obj.trackNumber.split(' ')[0];
	extractedObj.shippedDate = obj.trackNumber.split(' ').slice(1, 4).join(' ');
	extractedObj.address = obj.address;
	extractedObj.province = obj.address.split(' ')[n-2].split('.')[1];
	extractedObj.remark = obj.remark;
	extractedObj.phone = obj.phone;
	extractedObj.amount = obj.amount;
	extractedObj.admin = obj.admin;
	extractedObj.shipping = obj.shipping;
	extractedObj.payment = obj.payment;
	extractedObj.barcode = obj.barcode;
	extractedObj.status = '-';
	extractedObj.deliverDate = '-';
	
	return extractedObj;
}

// take [orders]  and update it
function updateOrder(res){
	var count = 0;
	Order.find({}, function(err, orders){
		var barcodes = [];
		orders.forEach(function(order){
			// only update the incompleted orders
			if(order.status != 'นำจ่ายสำเร็จ') barcodes.push(order.barcode);
		})
		
		thPostRequest(barcodes).then(parsedBody => {
			barcodes.forEach(function(barcode){
			var latestProcess = getLatestProcess(parsedBody.response.items[barcode])
			Order.updateOne({barcode: barcode}, {
				$set: {
					status: latestProcess.status_description,
					deliverDate: latestProcess.delivery_datetime == null ? '-' : numberToThDate(latestProcess.delivery_datetime)
				}
			}, function(){
				count++;
				if(count == barcodes.length){
					Order.find({}, function(err, updatedOrders){
						console.log("Update Order Done!");
						res.send(updatedOrders);
					})
				}
				})
			})
		})
	})
}

// example
// 02/12/2563 14:20:01
function numberToThDate(date){
	var mthNumberToTh = {
		"01": "ม.ค.",
		"02": "ก.พ.",
		"03": "มี.ค.",
		"04": "เม.ย",
		"05": "พ.ค.",
		"06": "มิ.ย.",
		"07": "ก.ค.",
		"08": "ส.ค.",
		"09": "ก.ย.",
		"10": "ต.ค.",
		"11": "พ.ย.",
		"12": "ธ.ค."
	}
	var DDMMYY = date.split(' ')[0].split('/');
	return DDMMYY[0] + ' ' + mthNumberToTh[DDMMYY[1]] + ' ' + DDMMYY[2];
}

// example
// 12 Jul 2020
function enToThDate(date){
	var mthEnToTh = {
		Jan: "ม.ค.",
		Feb: "ก.พ.",
		Mar: "มี.ค.",
		Apr: "เม.ย",
		May: "พ.ค.",
		Jun: "มิ.ย.",
		Jul: "ก.ค.",
		Aug: "ส.ค.",
		Seb: "ก.ย.",
		Oct: "ต.ค.",
		Nov: "พ.ย.",
		Dec: "ธ.ค."
	}
    var MMDDYY = date.split(' ').slice(1, 4);
    MMDDYY[2] = Number(MMDDYY[2]) + 543;
    return MMDDYY[1] + ' ' + mthEnToTh[MMDDYY[0]] + ' ' + MMDDYY[2];
}


function sortRemark(remarks){
	return remarks.sort( (a, b) => b.count - a.count);
}

