Power Grid
===========

This is, without a doubt, a Work In Progress.

Here be dragons.

Request Response Model
======================

Changing Display Name
------------------

name:

	Request = String

	Response = {
		group: 'displayName',
		args: 'uid,newName'
	}
	
Sending Chat Messages
---------------------

sendchat:

	Request = String
	
	Response = undefined
	
First Connection
----------------
	
connection:

	Request = Socket Object
	
	Response = {
		group: 'newPlayer',
		args: 'uid'
	}
	
Performing Game Actions
-----------------------
	
gameaction:

	Request = {
		uid: 'uid',
		cmd: 'startGame|startAuction|bid|buy|build',
		args: 'arg1,arg2,...'
	}
	
	Response = {
		group: 'varies',
		args: varies
	}
	
	* Start Game, Request
		cmd: 'startGame',
		args: ''
	* Start Game, 
		Response1 = ResourcePoolResponse
		Response2 = CurrentPlayerOrderResponse
		Response3 = CurrentPlayerResponse
	
	
Various Responses
-----------------

CurrentPlayerResponse = {

}
	
CurrentPlayerOrder = {
	group: 'playerOrder',
	args: Array of Player UIDs
}

ResourcePoolResponse = {
	group: 'resourcePool',
	args: Map of Resources, String -> count
}
	
other:
	
	
	
	
	
	
	