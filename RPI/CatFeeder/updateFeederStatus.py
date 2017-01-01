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
import PIL
from PIL import Image, ImageChops
import math, operator
import os
import RPi.GPIO as GPIO

#Setup topic_id to communicate to cloud services
topic = 'YOUR TOPIC'
time_delay_in_secs = 900 #30 #3600 # seconds between updating thingshadow - 1 hour
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
		#print("property: " + str(payloadDict["state"]["desired"]["property"]))
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


def update_foodbowl():
	    	#Setup ImageChops variables
    		#empty_path = "/home/pi/CatFeeder/CompareImages/empty.jpg"
    		full_path = "/home/pi/CatFeeder/CompareImages/full.jpg"
    		compare_path = "/home/pi/CatFeeder/CompareImages/compare.jpg"


		#Take Photo
    		os_string = "fswebcam --no-banner " + compare_path
    		os.system(os_string)
    		time.sleep(2)

    		#Calculate the root-mean-square difference between two images
	    	im1 = Image.open(full_path)
   		im2 = Image.open(compare_path)
    		diff = ImageChops.difference(im1, im2)
    		h = diff.histogram()
    		sq = (value*(idx**2) for idx, value in enumerate(h))
    		sum_of_squares = sum(sq)
    		rms = math.sqrt(sum_of_squares/float(im1.size[0] * im1.size[1]))

		#Determine if bowl is full (100) or empty (0)
		if rms < 580:
			amount = 100
		elif rms < 610:
			amount = 75
		elif rms < 660:
			amount = 50
		elif rms < 680:
			amount =25
		elif rms > 680:
			amount = 0 

		print "rms:",rms
		print "Amount:",amount,"%"
		return amount

def update_hopper():
		#Setup Ultrasonic Sensor
		GPIO.setmode(GPIO.BCM)
		SIG = 17
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
			amount = 15

		print "Distance:",distance,"cm"
		print "Amount:",amount,"oz"
		return amount

#print(update_foodbowl())

def update_shadows(sc):
        foodbowl_amount = update_foodbowl()
        hopper_amount = update_hopper()

        JSONPayload = ('{"state":{"desired":{"foodbowl":' + 
        str(foodbowl_amount) + 
	',"hopper":' + str(hopper_amount) + '}}}')
        Bot.shadowUpdate(JSONPayload, customShadowCallback_Update, 5)

        s.enter(time_delay_in_secs, 1, update_shadows, (sc,))

s.enter(time_delay_in_secs, 1, update_shadows, (s,))
s.run()

