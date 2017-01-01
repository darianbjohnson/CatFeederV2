var aws = require('aws-sdk');  
var ddb = new aws.DynamoDB();

exports.handler = (event, context, callback) => {
    var topic_id = event.serial;
    var access_token = event.access_token;
    var refresh_token = event.refresh_token;
    //note - will no long store access_code; instead, will retrieve everytime from refresh_token
    //refresh_token stays the same until user un-registers
    
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
    		callback(null, 'There was an error calling the function.');
    	}else{
    		var recordcount = data.Items.length;

    		if (recordcount>0){
    			data.Items.forEach(function(item) {

                var docUpdateClient = new aws.DynamoDB.DocumentClient();

				updateparams = {
					TableName: "Cat_Feeder_Config",
					Key:{
						"UserId": item.UserId
					},
					UpdateExpression: 'SET Refresh_Token = :refresh, CancelNumber = :cancel',			
						ExpressionAttributeValues: { 
							":refresh": refresh_token,
							":cancel": 0
						},
						ReturnValues: "UPDATED_NEW"
				};

				docUpdateClient.update(updateparams, function(err, data) {
					if (err){
					    callback(null, 'There was an error updating the value.' + err);
					} 
					else callback(null, 'Success');
				});
            

    			});
    		}else{
    		    console.log('here not in count');
    		    callback(null, 'The entered code (topic_id) was not found, can you please try again?');
    		}
    	}

    });

};