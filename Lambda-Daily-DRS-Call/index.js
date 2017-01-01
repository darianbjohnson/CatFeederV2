var aws = require('aws-sdk');  
var ddb = new aws.DynamoDB();
var TokenProvider = require('refresh-token');
const https = require('https');
var querystring = require('querystring');

exports.handler = (event, context, callback) => {
    
    //var api_call = "event.api_call";
    //var api_call = "Replenish";
    //var api_call = "SubscriptionInfo";
    var api_call = "DeviceStatus";

    var client_id = '<CLIENTID>';
    var client_secret = '<CLIENTSECRET>';
    
    var docClient = new aws.DynamoDB.DocumentClient();
	var params = {
		TableName: "Cat_Feeder_Config"
	};
	
	docClient.scan(params, function(err, data) {
    	if (err){
    		console.log(JSON.stringify(err, null, 2));
    		callback(null, 'There was an error calling the function.');
    	}else{
    		
    		var recordcount = data.Items.length;
    		var i = 0;

    		var getReq;
    		var options;
    		data.Items.forEach(function(item) {

                if (item.Refresh_Token){
                            
                    var refresh_token = item.Refresh_Token;
            	    var active_date = new Date(item.Last_Feeding);
            	    var active_date_iso = active_date.toISOString();
            			    
            	    active_date_iso = active_date_iso.split('.')[0]+"Z"; 
    
                    var tokenProvider = new TokenProvider('https://api.amazon.com/auth/o2/token', {
                        refresh_token: refresh_token, 
                        client_id:     client_id, 
                        client_secret: client_secret
                    });
                        
                    tokenProvider.getToken(function (err, token) {
                            
                        switch(api_call){
    
                            case "DeviceStatus":
                                DRS_DeviceStatus(token, active_date_iso, function(return_val){
                                    //callback(null,"success-DeviceStatus");
                                    console.log(return_val);
                                });
                                break;
                                
                            case "SubscriptionInfo":
                                DRS_SubscriptionInfo(token, function(slotID, slotSubscribed){
                                    //console.log(slotID);
                                    //console.log(slotSubscribed);
                                    //callback(null,"success-SubscriptionInfo");
                                });
                                break;
                                    
                            case "Replenish":
                                DRS_SubscriptionInfo(token, function(slotID,slotSubscribed){
                                        
                                    if (slotSubscribed === true){
                                                
                                        DRS_Replenish(token, slotID, function(return_val){
                                            console.log(return_val);
                                            //callback(null,"success-Replenish");
                                        });
                                                
                                    }
                                });
                                break;
                
                            }
                        });
                            
                    
                }
        	
    		    i++;
        	    while (i == recordcount){
        	        callback(null, "success");
        	        return;
        	    }

    		});
        	    
        }

    });

};


function DRS_SubscriptionInfo(token, eventCallback){
    
	var options = {
		hostname: 'dash-replenishment-service-na.amazon.com',
		port: 443,
		path: '/subscriptionInfo',
		method: 'GET',
		headers: {'Authorization' : 'Bearer ' + token,
            'x-amzn-accept-type': 'com.amazon.dash.replenishment.DrsSubscriptionInfoResult@1.0',
            'x-amzn-type-version': 'com.amazon.dash.replenishment.DrsSubscriptionInfoInput@1.0'}
		};
				
					
	var req = https.request(options, (res) => {
	    //console.log('statusCode:', res.statusCode);
		//console.log('headers:', res.headers);
		res.on('data', (d) => {

			var body = d.toString("utf8");
			body = JSON.parse(body);

			var slotID = Object.keys(body.slotsSubscriptionStatus)[0];
            var slotSubscribed = body.slotsSubscriptionStatus[slotID];

			eventCallback(slotID, slotSubscribed);   						
    						
		});
	});

	req.on('error', (e) => {
		console.log("we have a error");
		console.error(e);
	});
	req.end();
    			    
}

function DRS_Replenish(token, slotID, eventCallback){
    
	var options = {
		hostname: 'dash-replenishment-service-na.amazon.com',
		port: 443,
		path: '/replenish/' + slotID,
		method: 'POST',
		headers: {'Authorization' : 'Bearer ' + token,
            'x-amzn-accept-type': 'com.amazon.dash.replenishment.DrsReplenishResult@1.0',
            'x-amzn-type-version': 'com.amazon.dash.replenishment.DrsReplenishInput@1.0'}
		};
				
					
	var req = https.request(options, (res) => {
	    //console.log('statusCode:', res.statusCode);
		//console.log('headers:', res.headers);
		res.on('data', (d) => {

			var body = d.toString("utf8");
			console.log(body);
			eventCallback(body);
    								
		});
	});

	req.on('error', (e) => {
		console.log("we have a error");
		console.error(e);
	});
	req.end();
    			    
}

function DRS_DeviceStatus(token, isoDate, eventCallback){
    
    var data = JSON.stringify({
      mostRecentlyActiveDate: isoDate
    });
    
	var options = {
		hostname: 'dash-replenishment-service-na.amazon.com',
		port: 443,
		path: '/deviceStatus' ,
		method: 'POST',
		headers: {'Authorization' : 'Bearer ' + token,
            'x-amzn-accept-type': 'com.amazon.dash.replenishment.DrsDeviceStatusResult@1.0',
            'x-amzn-type-version': 'com.amazon.dash.replenishment.DrsDeviceStatusInput@1.0',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
		}
	};
	
	var req = https.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('statusCode:', res.statusCode);
            console.log("body: " + chunk);
            eventCallback(chunk);
            
        });
    });

    req.write(data);
    req.end();
    
}