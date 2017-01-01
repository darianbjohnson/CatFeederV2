'''
/*
 * Copyright 2010-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
 '''

from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTShadowClient
from gpiozero import LightSensor

import sched
import sys
import logging
import time
import json
import getopt
import RPi.GPIO as GPIO


#Setup topic_id to communicate to cloud services
topic = '6e147add-791e-42a1-85f2-17b89fbccfcc'
time_delay_in_secs = 30 #3600 # seconds between updating thingshadow - 1 hour
s = sched.scheduler(time.time, time.sleep)


# Shadow JSON schema:
#
# Name: <Topic>
# {
#	"state": {
#		"desired":{
#			"property":<INT VALUE>
#		}
#	}
#}

# Custom Shadow callback
def customShadowCallback_Update(payload, responseStatus, token):
	# payload is a JSON string ready to be parsed using json.loads(...)
	# in both Py2.x and Py3.x
	if responseStatus == "timeout":
		print("Update request " + token + " time out!")
	if responseStatus == "accepted":
		payloadDict = json.loads(payload)
		print("~~~~~~~~~~~~~~~~~~~~~~~")
		print("Update request with token: " + token + " accepted!")
		print("property: " + str(payloadDict["state"]["desired"]["property"]))
		print("~~~~~~~~~~~~~~~~~~~~~~~\n\n")
	if responseStatus == "rejected":
		print("Update request " + token + " rejected!")

def customShadowCallback_Delete(payload, responseStatus, token):
	if responseStatus == "timeout":
		print("Delete request " + token + " time out!")
	if responseStatus == "accepted":
		print("~~~~~~~~~~~~~~~~~~~~~~~")
		print("Delete request with token: " + token + " accepted!")
		print("~~~~~~~~~~~~~~~~~~~~~~~\n\n")
	if responseStatus == "rejected":
		print("Delete request " + token + " rejected!")


# Parameters
host = "data.iot.us-east-1.amazonaws.com"
rootCAPath = "/home/pi/certs/verisign-cert.pem"
certificatePath = "/home/pi/certs/CatFeeder.cert.pem"
privateKeyPath = "/home/pi/certs/CatFeeder.private.key"


# Configure logging
#logger = logging.getLogger("AWSIoTPythonSDK.core")
#logger.setLevel(logging.ERROR)
#streamHandler = logging.StreamHandler()
#formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
#streamHandler.setFormatter(formatter)
#logger.addHandler(streamHandler)

# Init AWSIoTMQTTShadowClient
myAWSIoTMQTTShadowClient = AWSIoTMQTTShadowClient("basicShadowUpdater")
myAWSIoTMQTTShadowClient.configureEndpoint(host, 8883)
myAWSIoTMQTTShadowClient.configureCredentials(rootCAPath, privateKeyPath, certificatePath)

# AWSIoTMQTTShadowClient configuration
myAWSIoTMQTTShadowClient.configureAutoReconnectBackoffTime(1, 32, 20)
myAWSIoTMQTTShadowClient.configureConnectDisconnectTimeout(10)  # 10 sec
myAWSIoTMQTTShadowClient.configureMQTTOperationTimeout(5)  # 5 sec

# Connect to AWS IoT
myAWSIoTMQTTShadowClient.connect()

# Create a deviceShadow with persistent subscription
Bot = myAWSIoTMQTTShadowClient.createShadowHandlerWithName(topic, True)

# Delete shadow JSON doc
Bot.shadowDelete(customShadowCallback_Delete, 5)


	#Setup Ultrasonic Sensor
	GPIO.setmode(GPIO.BCM)
	SIG = 18
	GPIO.setup(SIG, GPIO.OUT)

    	print "Distance Measurement In Progress"

	GPIO.setup(SIG, GPIO.OUT)
	GPIO.output(SIG, False)
	print "Waiting For Sensor To Settle"
	time.sleep(2)

	GPIO.output(SIG, True)
	time.sleep(0.00001)
	GPIO.output(SIG, False)

	while GPIO.input(SIG)==0:
		pulse_start = time.time()

	while GPIO.input(SIG)==1:
		pulse_end = time.time()

	pulse_duration = pulse_end - pulse_start
	distance = pulse_duration * 17150
	distance = round(distance, 2)

	if distance > 20:
		amount = 1000
	elif distance > 18:
		amount = 3
	elif distance > 16.24:
		amount = 3.9
	elif distance > 14.55:
		amount = 5
	elif distance > 12.87:
		amount = 6.1	
	elif distance > 11.23:
		amount = 7.2
	elif distance > 9.66:
		amount = 8.3
	elif distance > 8.09:
		amount = 9.4
	elif distance > 7.39:
		amount = 10.6
	elif distance > 5.84:
		amount = 11.7
	elif distance > 4.7:
		amount = 12.8
	elif distance > 3.9:
		amount = 13.9
	elif distance > 2.81:
		amount = 25

	print "Distance:",distance,"cm"
	print "Amount:",amount,"oz"

	JSONPayload = '{"state":{"desired":{"property":' +  str(amount) + '}}}'
	Bot.shadowUpdate(JSONPayload, customShadowCallback_Update, 5)

	GPIO.cleanup()   



