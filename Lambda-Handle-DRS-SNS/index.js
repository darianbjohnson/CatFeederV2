'use strict';
var aws = require('aws-sdk');  
var ddb = new aws.DynamoDB();

console.log('Loading function');

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    const message = event.Records[0].Sns.Message;
    console.log('From SNS:', message);
    console.log('From SNS- Notification Type:', message.notificationInfo.notificationType);
    
    var status = message.notificationInfo.notificationType;
    var topic_id = message.deviceInfo.deviceIdentifier.serialNumber;
    
    switch(status){
        case 'DeviceDeregisteredNotification':
            new DeleteRegistration(topic_id, status, function(return_value) {
                callback(null,return_value);
            });
            break;
        case 'SubscriptionChangedNotification':
            callback(null,'sub changed');
            break;
        case 'OrderPlacedNotification':
             new OrderPlaced(topic_id, status, function(return_value) {
                callback(null,'order placed');
            });
            break;
        case 'OrderCancelledNotification':
            new OrderCancelled(topic_id, status, function(return_value) {
                callback(null,'order cancelled');
            });
            break;
        case 'ItemShippedNotification':
            var order = parseInt(message.orderInfo.productInfo[0].quantity);
            order = order * 16; //convert pounds to ounces
            new ItemShipped(topic_id, status, order, function(return_value) {
                callback(null,'item shipped');
            });
            break;
    }
};

function DeleteRegistration(topic_id, status, eventCallback){
        var docClient = new aws.DynamoDB.DocumentClient();
	
	var params = {
		TableName: "Cat_Feeder_Config",
		IndexName: 'Topic_ID_index',
		KeyConditionExpression: "Topic_ID = :topicID",
		ExpressionAttributeValues: {
			":topicID": topic_id
		},
		ScanIndexForward: false
	};
	
	docClient.query(params, function(err, data) {
    	if (err){
    		console.log(JSON.stringify(err, null, 2));
    		eventCallback('There was an error calling the function.');
    	}else{
    		var recordcount = data.Items.length;

    		if (recordcount>0){
    			data.Items.forEach(function(item) {

                    var docUpdateClient = new aws.DynamoDB.DocumentClient();
    
    				var updateparams = {
    					TableName: "Cat_Feeder_Config",
    					Key:{
    						"UserId": item.UserId
    					},
    					UpdateExpression: 'REMOVE Refresh_Token, DRSStatus',			
    					ReturnValues: "UPDATED_NEW"
    				};
    
    				docUpdateClient.update(updateparams, function(err, data) {
    					if (err){
    					    eventCallback('There was an error updating the value.' + err);
    					} 
    					eventCallback('Success');
				    });

    			});
    		}else{
    		    console.log('here not in count');
    		    eventCallback('The entered code (topic_id) was not found, can you please try again?');
    		}
    	}

    });
}

function ItemShipped(topic_id, status, order, eventCallback){
        var docClient = new aws.DynamoDB.DocumentClient();
	
	var params = {
		TableName: "Cat_Feeder_Config",
		IndexName: 'Topic_ID_index',
		KeyConditionExpression: "Topic_ID = :topicID",
		ExpressionAttributeValues: {
			":topicID": topic_id
		},
		ScanIndexForward: false
	};
	
	docClient.query(params, function(err, data) {
    	if (err){
    		console.log(JSON.stringify(err, null, 2));
    		eventCallback('There was an error calling the function.');
    	}else{
    		var recordcount = data.Items.length;

    		if (recordcount>0){
    			data.Items.forEach(function(item) {

                    var docUpdateClient = new aws.DynamoDB.DocumentClient();
    
    				var updateparams = {
    					TableName: "Cat_Feeder_Config",
    					Key:{
    						"UserId": item.UserId
    					},
    					UpdateExpression: 'SET DRSStatus = :status, totalQuantityOnHand = totalQuantityOnHand  + :order, CancelNumber = :cancelnum REMOVE Reorder',			
    						ExpressionAttributeValues: { 
    							":status": 'ok',
    							":order": order,
    							":cancelnum" : 0
    						},
    						ReturnValues: "UPDATED_NEW"
    				};
    
    				docUpdateClient.update(updateparams, function(err, data) {
    					if (err){
    					    console.log(err);
    					    eventCallback('There was an error updating the value.' + err);
    					} 
    					eventCallback('Success');
    				});
            

    			});
    		}else{
    		    console.log('here not in count');
    		    eventCallback('The entered code (topic_id) was not found, can you please try again?');
    		}
    	}

    });
}

function OrderCancelled(topic_id, status, eventCallback){
        var docClient = new aws.DynamoDB.DocumentClient();
	
	var params = {
		TableName: "Cat_Feeder_Config",
		IndexName: 'Topic_ID_index',
		KeyConditionExpression: "Topic_ID = :topicID",
		ExpressionAttributeValues: {
			":topicID": topic_id
		},
		ScanIndexForward: false
	};
	
	docClient.query(params, function(err, data) {
    	if (err){
    		console.log(JSON.stringify(err, null, 2));
    		eventCallback('There was an error calling the function.');
    	}else{
    		var recordcount = data.Items.length;

    		if (recordcount>0){
    		    
    		    var reorder_date = new Date();
                var numberOfDaysToAdd = 2;
                reorder_date.setDate(reorder_date.getDate() + numberOfDaysToAdd);
                reorder_date = reorder_date.getTime();
                
    		    
    			data.Items.forEach(function(item) {
                    var docUpdateClient = new aws.DynamoDB.DocumentClient();
    
    				var updateparams = {
    					TableName: "Cat_Feeder_Config",
    					Key:{
    						"UserId": item.UserId
    					},
    					UpdateExpression: 'SET DRSStatus = :status, CancelNumber = CancelNumber + :incr, Reorder = :orderdate, NotifyUser=:notifyUser',			
    						ExpressionAttributeValues: { 
    							":status": status,
    							":incr": 1,
    							":orderdate" :reorder_date,
    							":notifyUser" :"Y"
    						},
    						ReturnValues: "UPDATED_NEW"
    				};
    
    				docUpdateClient.update(updateparams, function(err, data) {
    					if (err){
    					    console.log(err);
    					    eventCallback('There was an error updating the value.' + err);
    					} 
    					eventCallback('Success');
    				});
            

    			});
    		}else{
    		    console.log('here not in count');
    		    eventCallback('The entered code (topic_id) was not found, can you please try again?');
    		}
    	}

    });
}

function OrderPlaced(topic_id, status, eventCallback){
        var docClient = new aws.DynamoDB.DocumentClient();
	
	var params = {
		TableName: "Cat_Feeder_Config",
		IndexName: 'Topic_ID_index',
		KeyConditionExpression: "Topic_ID = :topicID",
		ExpressionAttributeValues: {
			":topicID": topic_id
		},
		ScanIndexForward: false
	};
	
	docClient.query(params, function(err, data) {
    	if (err){
    		console.log(JSON.stringify(err, null, 2));
    		eventCallback('There was an error calling the function.');
    	}else{
    		var recordcount = data.Items.length;

    		if (recordcount>0){
    		    
    			data.Items.forEach(function(item) {
                    var docUpdateClient = new aws.DynamoDB.DocumentClient();
    
    				var updateparams = {
    					TableName: "Cat_Feeder_Config",
    					Key:{
    						"UserId": item.UserId
    					},
    					UpdateExpression: 'SET DRSStatus = :status, CancelNumber = :cancelNumber, Reorder = :orderdate',			
    						ExpressionAttributeValues: { 
    							":status": status,
    							":cancelNumber": 0,
    							":orderdate": 0
    						},
    						ReturnValues: "UPDATED_NEW"
    				};
    
    				docUpdateClient.update(updateparams, function(err, data) {
    					if (err){
    					    console.log(err);
    					    eventCallback('There was an error updating the value.' + err);
    					} 
    					eventCallback('Success');
    				});
            

    			});
    		}else{
    		    console.log('here not in count');
    		    eventCallback('The entered code (topic_id) was not found, can you please try again?');
    		}
    	}

    });
}
