/**
 *  Cat Feeder Skill code
 *  written by Darian Johnson
 *  @darianbjohnson (twitter)
*/

/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * External Requires
 */
var AWS = require('aws-sdk'); 
var ddb = new AWS.DynamoDB();
var iotdata = new AWS.IotData({endpoint: '<IOTENDPONT>'});
var TokenProvider = require('refresh-token');
const https = require('https');
var querystring = require('querystring');
var uuid = require('uuid');
var request = require('request');

/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

//Global variables
var topic_id = "";

/**
 * CatFeeder is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var CatFeeder = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
CatFeeder.prototype = Object.create(AlexaSkill.prototype);
CatFeeder.prototype.constructor = CatFeeder;

//Global arrays
var sessionAttributes = {}; 
var monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
    ];
	
var monthNums = ["01", "02", "03", "04", "05", "06",
                      "07", "08", "09", "10", "11", "12"];

CatFeeder.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("CatFeeder onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
	
    // any session init logic would go here
};

CatFeeder.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("CatFeeder onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

CatFeeder.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};


/**********************************************************************************
 *  INTERPRET INTENTS AND ROUTE APPROPRIATELY
 *  This section routes the user to the correct intent
 */

CatFeeder.prototype.intentHandlers = {
	//Called when user asks to feed the cat
	"FeedCat": function (intent, session, response) {

		getTopic(session.user.userId, function(value){

			topic_id = value;

			if (topic_id === 'notset'){	
				firstTimeConfig(intent, session, response);
			}else{	
				feedCat(intent, session, response);
			}
		});
		
    },

	//called when user asks to configre their system (receive a new code)
	"Configure": function (intent, session, response) {
		
			reConfigure(intent, session, response);
		
    },

	//called when the user requests to know the amount of food in the bowl
	"GetFoodBowlStatus": function (intent, session, response) {
		getTopic(session.user.userId, function(value){

			topic_id = value;

			if (topic_id === 'notset'){
				firstTimeConfig(intent, session, response);
			}else{
				getFoodBowlStatus(intent, session, response);
				return;
			}
		});
	
    },

	//called to get the last time Alexa attempted to dispense food
	"GetLastFeedingTime": function (intent, session, response) {
		
		getTopic(session.user.userId, function(value){

			topic_id = value;

			if (topic_id === 'notset'){	
				firstTimeConfig(intent, session, response);
			}else{
				getLastFeedingTime(intent, session, response);
			}
		});
		
    },

	//called to determine if the food hopper needs to be refilled
	"GetCatFeederStatus": function (intent, session, response) {

		getTopic(session.user.userId, function(value){

			topic_id = value;

			if (topic_id === 'notset'){	
				firstTimeConfig(intent, session, response);
			}else{
				getCatFeederStatus(intent, session, response);
			}
		});
		
    },


	//routes the user appropriately if they respond with a number
	"HandleNumber": function (intent, session, response){

		getTopic(session.user.userId, function(value){

			topic_id = value;

			if (topic_id === 'notset'){	
				firstTimeConfig(intent, session, response);
			}else{	
				feedCat(intent, session, response);
			}
		});

	},

	//called when the user asks to receive a link to the instrcutions
	"SendMeInstructions": function (intent, session, response) {
        var speechOutput = {
                speech: "Ok, I've send you the instructions. Check you Alexa app.",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

		var cardTitle = "Instructions";

		var cardContent = "Here is the link to the instructions on building the cat feeder: https://darianbjohnson.com/catfeeder\n" +
						 "Typical commands include:\n"+
						 "- Feed my cat\n" +
						 "- Feed my cat four ounces\n" +
						 "- When did I last feed the cat?\n" +
						 "- Does my cat need food? \n" +
						 "- Do I need to fill my feeder? \n" +
						 "- Configure"
							
        response.tellWithCard(speechOutput, cardTitle, cardContent);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "Ok. Here's how I can help. I can feed your cat up to 4 ounces at a time. I work with a do it yourself Raspberry Pi cat feeder. " +
	       "You can ask me " +
		   "to feed the cat, " +
		   "When did I last feed the cat, " +
		   "Does the cat feed food, " +
		   "and, Do I need to fill the feeder. " +
		   "Check the Alexa App for a link to instructions on how to build the cat feeder and link it to this skill. "
		   "So, how can I help you?"
        var repromptText = "Ask me to feed the cat.";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

		var cardTitle = "Help";

		var cardContent = "Here is the link to the instructions on building the cat feeder: https://darianbjohnson.com/catfeeder\n" +
						 "Typical commands include:\n"+
						 "- Feed my cat\n" +
						 "- Feed my cat four ounces\n" +
						 "- When did I last feed the cat?\n" +
						 "- Does my cat need food? \n" +
						 "- Do I need to fill my feeder?"
							
        response.askWithCard(speechOutput, repromptOutput, cardTitle, cardContent);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.YesIntent": function (intent, session, response) {

		if (typeof session.attributes.override !== 'undefined'){

			if (session.attributes.override === true){
				feedCat(intent, session, response);
				//return;
			}

		}else{
			var speechOutput = {
				speech: "I'm sorry, I didn't understand your request. Goodbye.",
				type: AlexaSkill.speechOutputType.PLAIN_TEXT
			};
			response.tell(speechOutput);
		}
    },

	"AMAZON.NoIntent": function (intent, session, response) {

		if (typeof session.attributes.override !== 'undefined'){

			var speechOutput = {
				speech: "O.K. I won't feed your cat at this time. Goodbye.",
				type: AlexaSkill.speechOutputType.PLAIN_TEXT
			};
			response.tell(speechOutput);
			return;

		}else{
			var speechOutput = {
				speech: "I'm sorry, I didn't understand your request. Goodbye.",
				type: AlexaSkill.speechOutputType.PLAIN_TEXT
			};
			response.tell(speechOutput);
			return;
		}
    },

	//called when the user gives a random or unrelated request
	"CatchAllIntent": function (intent, session, response) {

		session.attributes = sessionAttributes;

		var speechOutput = {
			speech: "I'm sorry, but I did not understand your request. Can you please restate your request. If you need help, say 'help.",
			type: AlexaSkill.speechOutputType.PLAIN_TEXT
		};
		response.ask(speechOutput);
		return;
		
	}

};

/**********************************************************************************
 *  FORMAT AND HANDLE RESPONSES
 *  This section houses the functions responsible for returning a response to the user
 *********************************************************************************/

//WELCOME FUNCTION
function getWelcomeResponse(response) {
    var cardTitle = "The Cat Feeder";
    var speechText = "The Cat Feeder skill allows you to use a raspberry pi cat feeder to dispense food to your cat, or dog, using Alexa commands. " +
	"I've sent more information about the do-it-yourself feeder to your Alexa App. To get started, tell me to 'feed the cat'.";

	var repromptText = "Are you there? If you need help, say help.";

    var cardOutput = "The Cat Feeder skill works with a Raspberry Pi do it yourself Cat Feeder. Check the following site for more details: https://darianbjohnson.com/catfeeder.";

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
}


//MAIN FUNCTION - dispense food to the cat 
//This function:
// 1) checks to ensure the requested amount is approproate (1-4 oz)
// 2) check to see if the fodo bowl is full or empty and notifies user as appropriately
// 3) feeds the cat and takes the appropriate Dash Replehinshment actions
function feedCat(intent, session, response){
    var speechText = "";
    var repromptText = "";
    var speechOutput = "";
    var repromptOutput = "";
	var amount = 0;
	var ounces = 0;
	var payload ="";

	var topic = topic_id + '/feed' ; //used to route message to correct MQTT topic
	sessionAttributes.intent_from='feedCat'; //used to route intents if the user needs to provide the amout of food (size slot)

	if (typeof session.attributes.ounces !== 'undefined'){
		amount = session.attributes.amount;
		ounces = session.attributes.ounces;

	}else{
		if (intent.name === 'AMAZON.YesIntent'){ //if the user responds yes if Alexa asks if the user wishes to feed the cat
			speechText = "How much food do you want me to give the cat? Tell me either one, two, three, or four ounces."
			speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};

			response.ask(speechOutput);
			return;
		}

		if (typeof intent.slots.size.value === 'undefined'){ //amount of food not provided

			speechText = "How much food do you want me to give the cat? Tell me either one, two, three, or four ounces."

			speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};

			response.ask(speechOutput);
			return;
				
		}else if (isNumeric(intent.slots.size.value)){
			if (intent.slots.size.value >=1  && intent.slots.size.value <=4) {	//amount of food provided within range			
				ounces = Math.round(intent.slots.size.value);
				switch(ounces){
					case 1:
						amount = 1; //the number of seconds to run the servo
						break;
					case 2:
						amount = 2;
						break;
					case 3:
						amount = 3;
						break;
					case 4:
						amount = 4;
						break;
				}
			}
			else{ //amount of food not provided withing 1-4 ounce range
				speechText = "You didn't tell me a valid amount. Tell me either one, two, three, or four ounces."
				speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				response.ask(speechOutput);
			}
		}
	}

	sessionAttributes.amount = amount;
	sessionAttributes.ounces = ounces;

	//Get the amount of food in the food bowl - 100% (full), 75%, 50%, 25%, 0(empty)
	getFoodBowlStatusAPI(session.user.userId, function(bowl_status,bowl_perc){

		if (session.attributes.override === true){//override any additional prompts to the user. Typically if user looks a photo of cat bowl and wishes to feed cat less than 4 hours from last feeding
			bowl_perc = 0;
			bowl_status = 0;

		}

		if (bowl_status <0){
			sessionAttributes.override = true;
			session.attributes = sessionAttributes;
			speechText = "I am having a problem checking the amount of food in your bowl. Would you like me to feed the cat?"
				speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				response.ask(speechOutput);

		}else{

			if(bowl_perc >50){//bowl is at least 50% full; send a photo and validate that the user wants to feed the cats
				console.log("in here");
				topic = topic_id + '/photo' ;
				photo_name = uuid(); 
				payload = JSON.stringify({'photo': photo_name});	

				//send message to CatFeeder to take a photo
				publishMessage(topic, payload, function (result){
					
					sessionAttributes.override = true;
					session.attributes = sessionAttributes;

					var smImage = 'https://s3.amazonaws.com/catfeeder/Photos/' + photo_name + '.jpg';
					var lgImage = smImage;

					speechText = "I just checked your food bowl; it's looks about " + bowl_perc + " percent full. I've just put a picture of your cat's food bowl in the Alexa App. " +
								"Are you sure you want me to give the cat food?" ;
					repromptText = "Do you want me to feed the cat?"

					speechOutput = {
						speech: "<speak>" + speechText + "</speak>",
						type: AlexaSkill.speechOutputType.SSML
					};

					repromptOutput = {
						speech: repromptText,
						type: AlexaSkill.speechOutputType.PLAIN_TEXT
					};

					var cardTitle = "Your Cat Bowl";
					var cardContent = "Here is an image of your cat bowl."

					response.askWithImageCard(speechOutput, repromptOutput, cardTitle, cardContent, smImage, lgImage);

				});

			}else{ //Feed the cat because the bowl is almost empty (or we have received a command to feed the cat regardless of amount)
				topic = topic_id + '/feed' ;
				payload = JSON.stringify({'amount': amount});	

				//send message to Cat Feeder to dispense food
				publishMessage(topic, payload, function (result){

					ounces_str = ounces.toString();

					//update the last time the feeder was used
					updateLastFeeding(session.user.userId, function(results){

						//get the amount of food in the Hopper
						getCatFeederStatusAPI(session.user.userId, function(status, amount){

							//take approproate Dash Repl actions
							determineDRSaction(session.user.userId,amount,function(drs_status, message){

								var speechText_add = ""

								//provide status message based on amount of food in the hopper
								if (status === 0){
									speechText_add = " By the way, You only have " + amount + " ounces of food in the cat feeder. Please refill it at your earliest convenience."
								}

								//provide a status message based on the Dash Replenishment actions
								if (drs_status>0){
									speechText_add = " By the way, " + message;
								}
	
								//format message and send to user
								speechText = "O.K. I've dispensed " + ounces_str + " oz to the cat food bowl." + speechText_add;
								speechOutput = {
									speech: "<speak>" + speechText + "</speak>",
									type: AlexaSkill.speechOutputType.SSML
								};
								response.tell(speechOutput);
							});	
						});
					});
				});
			}

		}

	});
		
}

//FIRST TIME CONFIGUATION - sends instructions to build/configure the Cat Feeder
function firstTimeConfig(intent, session, response){

	configureCatFeeder(session.user.userId, function(topic_id){

	speechText = "You haven't configured this skill to use your Raspberry Pi Catfeeder yet. " +
	"I've sent instructions to your Alexa App. Follow these steps and come back after you've finished your configuration."

	speechOutput = {
		speech: "<speak>" + speechText + "</speak>",
		type: AlexaSkill.speechOutputType.SSML
	};

	var cardTitle = "Configure Your CatFeeder";
			var cardContent = "Your topic id is '" + topic_id + "'. You will update your scripts using this code and the authentication files located here (https://s3.amazonaws.com/catfeeder/CatFeederAuth.zip). Please download the authentication files and "+
						" follow the instructions here: https://darianbjohnson.com/catfeeder\n" +
						" You can reset your configuration at any time by asking me to 'setup my feeder'.";
					
	response.tellWithCard(speechOutput, cardTitle, cardContent);
				
	});


}

//FOLLOW-UP CONFIGUATION - sends instructions if the user needs the code again
function reConfigure(intent, session, response){

	//configureCatFeeder(session.user.userId, function(topic_id){

		speechText = "O.K. I've sent instructions to your Alexa App. Follow these steps and come back after you've finished your configuration."

		speechOutput = {
			speech: "<speak>" + speechText + "</speak>",
			type: AlexaSkill.speechOutputType.SSML
		};
		var cardTitle = "Configure Your CatFeeder";
		var cardContent = "Your topic id is '" + topic_id + "'. You will update your scripts using this code and the authentication files located here (https://s3.amazonaws.com/catfeeder/CatFeederAuth.zip). Please download the authentication files and "+
						" follow the instructions here: https://darianbjohnson.com/catfeeder\n" +
						" You can reset your configuration at any time by asking me to 'setup my feeder'.";
					
		response.tellWithCard(speechOutput, cardTitle, cardContent);
	//});

}

//main call when the user wishes to know if the pet has food in his dish
function getPicture(intent, session, response){


	sessionAttributes = {};
	topic = topic_id + '/photo';
			
	var speechText = "I've sent a photo to your Alexa App. Do you want me to feed the cat?"
	var repromptText = "Do you want me to feed the cat?"

	var speechOutput = {
		speech: "<speak>" + speechText + "</speak>",
		type: AlexaSkill.speechOutputType.SSML
	};

	var repromptOutput = {
		speech: repromptText,
		type: AlexaSkill.speechOutputType.PLAIN_TEXT
	};
			
	var cardTitle = "Your Cat Bowl";
	var cardContent = "Here is an image of your cat bowl.";

	var photo_name = uuid(); //get a unique name for the picture. Pass this name to camera so that the image is named the same before upload to s3
	var payload = JSON.stringify({'photo': photo_name});	

	var smImage = 'https://s3.amazonaws.com/catfeeder/Photos/' + photo_name + '.jpg';
	var lgImage = smImage;

	sessionAttributes.override = true; //set overide if the user wishes to feed to cat regardless of the time of the last feeding
	session.attributes = sessionAttributes;

	publishMessage(topic, payload, function (result){
		response.askWithImageCard(speechOutput, repromptOutput, cardTitle, cardContent, smImage, lgImage);
	});

}

//FOOD BOWL STATUS - call when the user wishes to know if the pet has food in his dish
function getFoodBowlStatus(intent, session, response){
	getFoodBowlStatusAPI(session.user.userId, function(bowl_status,bowl_perc){

		sessionAttributes.override = true;
		session.attributes = sessionAttributes;

		if (bowl_status <0){
			sessionAttributes.override = true;
			session.attributes = sessionAttributes;
			speechText = "I am having a problem checking the amount of food in your bowl. Would you like me to feed the cat?"
				speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};
				response.ask(speechOutput);

		}else{
			
			topic = topic_id + '/photo' ;
			photo_name = uuid(); 
			payload = JSON.stringify({'photo': photo_name});	

			//send message to CatFeeder to take a photo
			publishMessage(topic, payload, function (result){
					
				sessionAttributes.override = true;
				session.attributes = sessionAttributes;

				var smImage = 'https://s3.amazonaws.com/catfeeder/Photos/' + photo_name + '.jpg';
				var lgImage = smImage;

				speechText = "I just checked your food bowl; it's looks about " + bowl_perc + " percent full. I've just put a picture of your cat's food bowl in the Alexa App. " +
							"Do you want me to feed the cat?" ;
				repromptText = "Do you want me to feed the cat?"

				speechOutput = {
					speech: "<speak>" + speechText + "</speak>",
					type: AlexaSkill.speechOutputType.SSML
				};

				repromptOutput = {
					speech: repromptText,
					type: AlexaSkill.speechOutputType.PLAIN_TEXT
				};

				var cardTitle = "Your Cat Bowl";
				var cardContent = "Here is an image of your cat bowl."

				response.askWithImageCard(speechOutput, repromptOutput, cardTitle, cardContent, smImage, lgImage);

			});

		}

	});

}

//CAT FEEDER (HOPPER) STATUS - call when the user wishes to know if the food hopper needs to be refilled
function getCatFeederStatus(intent, session, response){
	sessionAttributes = {};
	getCatFeederStatusAPI(session.user.userId, function(value,amount){

		switch (value){//handle the users response based on amount of food in the hopper
			case -1:
				speechText = "I am unable to determine the amount of food in your feeder at this time. There might be a problem with the sensor. Please re-check and try again."
				break; 
			case 0:
				speechText = "You are running low on food. You only have " + amount + " ounces remaining in the hopper. You need to refill your feeder."
				break; 
			case 1:
				speechText = "At this time, you have adequate food in your feeder. By my estimation, you have " + amount + " ounces remaining in the hopper."
				break;
		}

		speechOutput = {
			speech: "<speak>" + speechText + "</speak>",
			type: AlexaSkill.speechOutputType.SSML
		};
        
		response.tell(speechOutput);
	});

}

//GET LAST FEEDING TIME - call when the user wishes to know the last time Alexa attempted to feed the pet
function getLastFeedingTime(intent, session, response){
	sessionAttributes = {};
	sessionAttributes.override = true;
	session.attributes = sessionAttributes;

	getLastFeeding(session.user.userId, function(minutes_since_last_fed){

		console.log(minutes_since_last_fed);

		if (minutes_since_last_fed < 90 ){

			speechText = "It's been " + minutes_since_last_fed + " minutes since I last fed the cats."

			speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};

			response.tell(speechOutput);
			return;

		}else if (minutes_since_last_fed < 1440 ){

			speechText = "It's been " + Math.round(minutes_since_last_fed/60) + " hours since I last fed the cats. Would you like me to feed your cat now?"
			speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};
			response.ask(speechOutput);
			return;

		}else if (minutes_since_last_fed < 86400 ){

			speechText = "It's been " + Math.round(minutes_since_last_fed/60/24) + " days since I last fed the cats. Would you like me to feed your cat now?"
			speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};
			response.ask(speechOutput);
			return;

		}else{

			speechText = "I don't think you've ever asked me to feed your cat. Would you like me to feed your cat now?"
			speechOutput = {
				speech: "<speak>" + speechText + "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			};
			response.ask(speechOutput);
			return;

		}
	});
}


/**********************************************************************************
 *  INTERFACE WITH API/DBs/ETC
 *  This section interfaces with apis, DBs, etc, formats the APi call response 
 *  and returns the needed information to the main functions
 */

//DB call to update the topic (code) for a user
function configureCatFeeder(userID, eventCallback){

	var docClient = new AWS.DynamoDB.DocumentClient();
	var topic_id = uuid(); 

	params = {
		TableName:"Cat_Feeder_Config",
			Item:{
				"UserId": userID,
				"Topic_ID": topic_id,
				"Last_Feeding": 1,
			}
	};

	docClient.put(params, function(err, data) {

		if (err) {
			console.log(err);
			console.log(err.stack);
			eventCallback('error');
			return;
		} else{
			console.log(data);
			eventCallback(topic_id);
		}
	});

}

//DB call to get the topic (code) for a user
function getTopic(userID, eventCallback){

	var docClient = new AWS.DynamoDB.DocumentClient();
	var topic_id;
	
	var params = {
		TableName: "Cat_Feeder_Config",
		KeyConditionExpression: "UserId = :userID",
		ExpressionAttributeValues: {
			":userID": userID
		},
		ScanIndexForward: false
	};

	docClient.query(params, function(err, data) {
		if (err)
			console.log(JSON.stringify(err, null, 2));
		else
			var recordcount = data.Items.length;

			if (recordcount>0){
				data.Items.forEach(function(item) {
					topic_id = item.Topic_ID;

				});				
			}else{
                topic_id = 'notset';
            }

			eventCallback(topic_id);
	});


}

//AWS IOT Call to publish a message on a provided topic
function publishMessage(topic, payload, eventCallback){

	var params = {
		topic: topic, /* required */
		//payload: new Buffer('...') || payload,
		payload: payload,
		qos: 1
	};
		iotdata.publish(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else     console.log(data);  
		
		eventCallback(data);         
	});


}

//AWS IOT Call to get the device status for the cat feeder hopper (does it need to be refilled)
function getCatFeederStatusAPI(userID, eventCallback){

	var params = {
		thingName: topic_id /* required */
	};

	iotdata.getThingShadow(params, function(err, body) {
		if (err) {
			console.log(err, err.stack); // an error occurred
			eventCallback(-1, 0);
		}else{
			payload = JSON.parse(body.payload);
			var amount = payload.state.desired.hopper;

			//check to see how much food is left in the hopper
			if (amount === 1000) { //there is an error
				eventCallback(-1, amount);
			}else{	

				if (amount < 4){
					eventCallback(0, amount);
				}else{
					eventCallback(1, amount);
				}	
				
	
			}
			
		}            
	});
}

//AWS IOT Call to get the device status for the cat food bowl (does it need to be refilled)
function getFoodBowlStatusAPI(userID, eventCallback){

	var params = {
		thingName: topic_id /* required */
	};

	iotdata.getThingShadow(params, function(err, body) {
		if (err) {
			console.log(err, err.stack); // an error occurred
			eventCallback(-1, 0);
		}else{
			payload = JSON.parse(body.payload);
			var amount = payload.state.desired.foodbowl;
			eventCallback(0,amount)
			
		}            
	});
}

//DB Call to update the last feeding time
function updateLastFeeding(userID, eventCallback){

	var date = new Date();
	var DateString = date.getFullYear() + "/" + monthNums[date.getMonth()] + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();;
	var standardizeDate = new Date (date.getFullYear(), date.getMonth(), date.getDate());
	var getTime = date.getTime();
	
	
	var docClient = new AWS.DynamoDB.DocumentClient();

	var params = {
		TableName: "Cat_Feeder_Config",
		KeyConditionExpression: "UserId = :userID",
		ExpressionAttributeValues: {
			":userID": userID
		},
		ScanIndexForward: false
	};

	docClient.query(params, function(err, data) {
		if (err){
			console.log(JSON.stringify(err, null, 2));
		}else

			var recordcount = data.Items.length;

			if (recordcount<1){//no entry; need to add

				params = {
					TableName:"Cat_Feeder_Config",
					Item:{
						"UserId": userID,
						"Last_Feeding": getTime
					}
				};

				docClient.put(params, function(err, data) {

					if (err) {
						console.log(err);
						console.log(err.stack);
						return;
					} else{
						console.log(data);
						eventCallback('new entry');
					}
				});

			}else{//need to update the last feeding time

				params = {
					TableName: "Cat_Feeder_Config",
					Key:{
						"UserId": userID
					},
					UpdateExpression: 'SET Last_Feeding = :feedting_time',			
					ExpressionAttributeValues: { 
						":feedting_time": getTime
					},
					ReturnValues: "UPDATED_NEW"
					};

				docClient = new AWS.DynamoDB.DocumentClient();

				docClient.update(params, function(err, data) {
					if (err) console.log(err);
					else eventCallback(getTime);
				});



			}

	});
	
}

//DB Call to get the last time Alexa attempted to dispense food
function getLastFeeding(userID, eventCallback){


	var minutes = 1000 * 60;
	var hours = minutes * 60;
	var days = hours * 24;
	var years = days * 365;
	var d = new Date();
	var t = d.getTime();

	var current_minutes = Math.round(t / minutes);

    console.log("userid: " + userID)
	var last_feeding = 0;
	var docClient = new AWS.DynamoDB.DocumentClient();
	
	var params = {
		TableName: "Cat_Feeder_Config",
		KeyConditionExpression: "UserId = :userID",
		ExpressionAttributeValues: {
			":userID": userID
		},
		ScanIndexForward: false
	};

	docClient.query(params, function(err, data) {
		if (err)
			console.log(JSON.stringify(err, null, 2));
		else
			var recordcount = data.Items.length;

			if (recordcount>0){//get the minutes since the last feeding
				data.Items.forEach(function(item) {
					last_feeding = parseInt(item.Last_Feeding);
					last_feeding = Math.round(last_feeding / minutes);
					last_feeding = current_minutes - last_feeding;
				});				
			}else{//we've never fed the pet. provide an outrageously high number'
                last_feeding = 10000000;
            }

			eventCallback(last_feeding);
	});
	
	
}


/**********************************************************************************
 *  ADMINISTRATIVE & HELPER FUNCTIONS
 */

//Validates is a value is a number; used to validate slots
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HistoryBuff Skill.
    var skill = new CatFeeder();
    skill.execute(event, context);
};


/**********************************************************************************
 *  Amazon Dash Replenishment Functionality
 */

function getDRS_token(userID,eventCallback){
	var client_id = '<CLIENTID>';
    var client_secret = '<CLIENTSECRET>';

	var docClient = new AWS.DynamoDB.DocumentClient();
	var params = {
		TableName: "Cat_Feeder_Config",
		KeyConditionExpression: "UserId = :userID",
		ExpressionAttributeValues: {
			":userID": userID
		},
		ScanIndexForward: false
	};

	
	docClient.query(params, function(err, data) {

    	if (err){
    		console.log(JSON.stringify(err, null, 2));
			console.log('error calling function');
    		eventCallback('Error');
			return;
    	}else{
    		var recordcount = data.Items.length;

    		if (recordcount>0){
    		    var getReq;
    		    var options;
    			data.Items.forEach(function(item) {


					if(item.Refresh_Token === 'undefined' ){
						console.log('Token not saved to User ID');
						eventCallback('Not signed up');
						return;
					}

    			    var refresh_token = item.Refresh_Token;		

                    var tokenProvider = new TokenProvider('https://api.amazon.com/auth/o2/token', {
                        refresh_token: refresh_token, 
                        client_id:     client_id, 
                        client_secret: client_secret
                    });
                    
                    tokenProvider.getToken(function (err, token) {

						if (err){
							console.log('error found:' + err);
							eventCallback('Error');
							return;
						}else{
							//console.log('did I get the token?:' + token);
							eventCallback(token);
							return;
						}
					});  

				});         

    		}else{
    		    console.log('here not in count');
    		    return 'Error';
    		}
    	}

    });

}

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
			//console.log(body);

			if (body.message){
				//console.log(body.message);
				eventCallback('0', false); 
			}else{
				var slotID = Object.keys(body.slotsSubscriptionStatus)[0];
            	var slotSubscribed = body.slotsSubscriptionStatus[slotID];

				console.log('slot id:' + slotID);
				eventCallback(slotID, slotSubscribed);   

			}  						
    						
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

function DRS_SlotStatus(token, slotID, repl_date_iso, active_date_iso ,originalQuantityInUnit, remainingQuantityInUnit, totalQuantityOnHand, eventCallback){
    
    var data = JSON.stringify({
		expectedReplenishmentDate: repl_date_iso,
		remainingQuantityInUnit: remainingQuantityInUnit,
		originalQuantityInUnit: originalQuantityInUnit,
		totalQuantityOnHand, totalQuantityOnHand,
      	lastUseDate: active_date_iso
    });
    
	var options = {
		hostname: 'dash-replenishment-service-na.amazon.com',
		port: 443,
		path: '/slotStatus/' + slotID,
		method: 'POST',
		headers: {'Authorization' : 'Bearer ' + token,
            'x-amzn-accept-type': 'com.amazon.dash.replenishment.DrsSlotStatusResult@1.0',
            'x-amzn-type-version': 'com.amazon.dash.replenishment.DrsSlotStatusInput@1.0',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
		}
	};
	
	var req = https.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //console.log('statusCode:', res.statusCode);
            //console.log("body: " + chunk);
            eventCallback(chunk);
            
        });
    });

    req.write(data);
    req.end();
    
}

function determineDRSaction(userID, amount, eventCallback){

	getDRS_token(userID, function(token){

		if (token == 'Error'){
			eventCallback(2, "There was an error connecting to Amazon Dash Replenishment. Please check your device status by going to the 'Manage your devices' section on Amazon dot com.");
			return;

		}else if (token == 'Not signed up'){
			status_num = 0 ;
			status_message = 'no message';
			eventCallback(status_num, status_message);
			return;

		}else{
			
			var docClient = new AWS.DynamoDB.DocumentClient();
			
			var params = {
				TableName: "Cat_Feeder_Config",
				KeyConditionExpression: "UserId = :userID",
				ExpressionAttributeValues: {
					":userID": userID
				},
				ScanIndexForward: false
			};

			docClient.query(params, function(err, data) {
				if (err)
					//console.log(JSON.stringify(err, null, 2));
					eventCallback(2, "There was an error connecting to Amazon Dash Replenishment. Please check your device status by going to the 'Manage your devices' section on Amazon dot com.");
				else
					var recordcount = data.Items.length;

					if (recordcount>0){
						data.Items.forEach(function(item) {

							/*****************************************
							 * Logic to get variables for DRS analysis/actions
							 *******************************************/

							var originalQuantityInUnit = 15; //Hopper can hold 15 ounces (weight)
							var totalQuantityOnHand = 0; //Assume none on hand until we can valdate what is saved in database
							var remainingQuantityInUnit = amount; //determine amount in hopper from sensor and Iot device Shadow

							if (item.totalQuantityOnHand){ //if this value is populated, use it
								totalQuantityOnHand = item.totalQuantityOnHand;
							}

							if (item.remainingQuantityInUnit){//compare what was saved and dertermine if more was added
								var orig_remainingQuantityInUnit = item.remainingQuantityInUnit;
								if (amount > orig_remainingQuantityInUnit){//the user added more
									totalQuantityOnHand = totalQuantityOnHand - (amount-orig_remainingQuantityInUnit);
									remainingQuantityInUnit = amount;
								}

							}

							if (totalQuantityOnHand<0){//if we get a negative value, normaize to zero
								totalQuantityOnHand = 0;
							}

							var cancelnumber = item.CancelNumber;
							var orderdate = 0;

							if (item.Reorder){//the item was canceled; this is the date that we need to reorder
								orderdate = item.Reorder;
							}

							//this logic determines if we need to re-start DRS re-ordering
							if (amount > 13 && cancelnumber==2) {//the user refilled the hopper and the cancel number is 2
								totalQuantityOnHand = 160 - amount; //assume that we purchased a 10 lb bag (10*16 = 160 oz)
								remainingQuantityInUnit = amount;
								cancelnumber = 0;
							}

							var NotifyUser = "N"
							if (item.NotifyUser){//we need to know if we need to notify the user
								NotifyUser = item.NotifyUser;
							}

							//Get the last date that the feeder was used
							var active_date = new Date(item.Last_Feeding);
							var active_date_iso = active_date.toISOString();    			    
							active_date_iso = active_date_iso.split('.')[0]+"Z"; 

							//Get the projected number of days before replenishment; this assumes we feed 1 cat 8oz a day
							var days_before_repl = (remainingQuantityInUnit + totalQuantityOnHand)/8; 
							
							//Get the projected replenishment date
							var repl_date = new Date();
							repl_date = addDays(repl_date, days_before_repl);
							var repl_date_iso = repl_date.toISOString();    			    
							repl_date_iso = repl_date_iso.split('.')[0]+"Z"; 

							//This is the total quanity on hand - in the feeder and in the bag
							var totalQuantity = totalQuantityOnHand + remainingQuantityInUnit;

							//Initialize DynamoDB update
							var status_num = -1 ;
							var status_message = "";											
							
							var updatedocClient = new AWS.DynamoDB.DocumentClient();
							var updateparams = {
								TableName: "Cat_Feeder_Config",
								Key:{
									"UserId": userID
								},
								UpdateExpression: 'SET remainingQuantityInUnit = :remainingQuantityInUnit, totalQuantityOnHand = :totalQuantityOnHand, NotifyUser = :notifyUser, CancelNumber = :cancelNumber',
								ExpressionAttributeValues: { 
									":remainingQuantityInUnit": remainingQuantityInUnit,
									":totalQuantityOnHand": totalQuantityOnHand,
									":notifyUser" : 'N',
									":cancelNumber" : cancelnumber
								},
								ReturnValues: "UPDATED_NEW"
							};

							/*****************************************
							* Update the Cat Feed Config tables
							*******************************************/
							updatedocClient.update(updateparams, function(err, data) {
								if (err){
									console.log(err);
									eventCallback(2, "There was an error connecting to Amazon Dash Replenishment. Please check your device status by going to the 'Manage your devices' section on Amazon dot com.");
								} else {


									console.log('update successful');
									/*****************************************
									 * Logic to determine what DRS functions to call
									 *******************************************/
									//Step 1 - Determine if the user is subscribed to slot 1 (Cat Food)
									DRS_SubscriptionInfo(token, function(slotID,slotSubscribed){
														
										//Step 1A - User is subscribed to slot				
										if (slotSubscribed === true){
											console.log('slotSubscribed:' + slotSubscribed);

											//Step 1A-1 - Send Slot Subscription information to DRS			
											DRS_SlotStatus(token, slotID, repl_date_iso, active_date_iso ,originalQuantityInUnit, remainingQuantityInUnit, totalQuantityOnHand, function(return_val){
												console.log('slot status:' + return_val);

												console.log('days_before_repl:' + days_before_repl);
			
												//Step 2A - Determine if we are running out of cat food
												if (days_before_repl<8){

													//Step 2A-1 - If the cancel number is zero, we know that we have not placed an order, so place the order
													if (cancelnumber == 0) {
														console.log('Place an order');
														DRS_Replenish(token, slotID, function(val){
															status_num = 0 ;
															status_message = val;
															eventCallback(status_num, status_message);
														});

													//Step 2A-2 - We have cancelled the order once and need to wait 5 days to reorder		
													}else if (cancelnumber == 1){
														var current = new Date();
														
														//The current date is greater than the re-order date, so need to re-order
														if (current > orderdate){
															console.log('Place a second order');
															DRS_Replenish(token, slotID, function(val){
																status_num = 0 ;
																status_message = val;
																eventCallback(status_num, status_message);
															});
														
														//The current date is greater than the re-order date, so no need to re-order
														}else{
															if (NotifyUser == "Y"){
																console.log('No more orders');
																var d = new Date(orderdate);						
																var DateString = monthNames[d.getMonth()] + ' ' + d.getDate()
																status_num = 1 ;
																status_message = "I noticed that you cancelled an earlier order. I will attempt to re-order on, or around, " + DateString + ".";					
																eventCallback(status_num, status_message);
														}else{//we have already notified the user; no need to tell the user again
																status_num = 0 ;
																status_message = 'no message';
																eventCallback(status_num, status_message);
															}
														}

													//Step 2A-3 - We have cancelled the order twice; we need to let the user know that we will
													//            not reorder until we determine that the user has refilled the hopper	
													}else{

															if (NotifyUser == "Y"){
																status_num = 1 ;
																status_message = "You have cancelled this order twice. I will not attempt to re-order until I determine that you have refilled the cat feeder.";
																eventCallback(status_num, status_message);
														}else{//we have already notified the user; no need to tell the user again
																status_num = 0 ;
																status_message = 'no message to user';
																eventCallback(status_num, status_message);
															}

													}

												//Step 2B - We are not running out of cat food; no DRS actions to take	
												}else{
													status_num = 0 ;
													status_message = return_val;
													eventCallback(status_num, status_message);
												}

											});
									
										//Step 2B - We are not registered to the slot, so no action to take						
										} else {
											console.log('slot not registered');
											status_num = 0 ;
											status_message = 'slot not registered';
											eventCallback(status_num, status_message);
										}
						
									});
												
								}
												
							});

										
						});				
					}

			});
		}

	});

}

