## Purpose

ec2ms allows the user to spin up multiple terminals and SSH into it automatically. Essentially it is an automation tool. The pain points were having to manually spin up each terminal. The key points are as follows: 

    1. Allows user to create tags, tying the tag to the ec2 name 
    2. Save the tags for easy reusability 
    3. Delete the tags as required
    4. Spin up terminals automatically after inputting the required fields
    5. Reuse previous sessions
    6. Sessions are encrypted. 

** WARNING: MAKE SURE YOU REMEMBER YOUR KEY ** 

## Features

1. Cache manager 
2. Choose the number of instances you want to spin up
3. Tagging of instances

## Flow 

Select number of instances you want to spin up -> Use a saved tag or create a new one -> Input EC2 name -> Input username -> Input PEM key 

