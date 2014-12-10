'use strict';

var mongoose = require( 'mongoose' );
var passport = require( 'passport' );
var request = require( 'request' );
var config = require( '../config/config.js' );
var utilities = require( '../utilities/utilities' );



// Logout

exports.logout = function( req, res )
{
	console.log( 'logout' );
	req.logout(  );
	res.send( 204, { } );
};



// Login

exports.loginUser = function( req, res, next )
{
	passport.authenticate( 'local-user', function( err, user, info )
	{
		var error = err || info;

		if( error )
		{
			return res.status( 401 ).json( error );
		}

		req.logIn( user, function( err )
		{
			if( err )
			{
				return res.send( err );
			}

			res.json( req.user.userInfo );
		} );
	} )( req, res, next );
};

exports.loginWithTwitterToken = function( req, res, next )
{
	passport.authenticate( 'twitter-token', function( err, user, info )
	{
		var error = err || info;
		if( error )
		{
			return res.json( 401, error );
		}

		req.logIn( user, function( err )
		{
			if( err )
			{
				return res.send( 500, { message: err.message } );
			}
			res.json( 200, req.user.userInfo );
		} );
	} )( req, res, next );
};

exports.loginWithFacebookToken = function( req, res, next )
{
	console.log( 'loginWithFacebookToken' );
	var accessToken = req.params.accessToken;
	var get =
	{
		uri: 'https://graph.facebook.com/me/',
		json:true,
		qs:
		{
			access_token:accessToken
		}
	};

	request( get, function( err, response, body )
	{
		if( err )
		{
			return res.send( 500, { message: err.message } );
		}

		if( response.statusCode === 200 )
		{
			var id = body.id;
			var name = body.name;
			var photo = 'https://graph.facebook.com/' + id + '/picture?width=200&height=200';
			var fakeEmail = id + '@facebook.com';

			var User = mongoose.model( 'User' );

			User.findOne( { facebookId:id }, function( err, user )
			{
				if( err )
				{
					return res.send( 500, { message: err.message } );
				}

				if( user === null )
				{
					user = new User( );
					user.name = name;
					user.photo = photo;
					user.provider = 'facebook';
					user.email = fakeEmail;
					user.salt = 'fake';
					user.hashedPassword = 'fake';
					user._id = utilities.newEncryptedId(  );
					user.facebookId = id;
				}

				user.save( function( err, savedGuest, numAffect )
				{
					if( err )
					{
						return res.send( 500, { message: err.message } );
					}
					req.logIn( savedGuest, function( err )
					{
						if( err )
						{
							return res.send( 500, { message: err.message } );
						}

						return res.json( 200, req.user.userInfo );
					} );
				} );
			} );
		}
		else
		{
			return res.send( 500, { message: 'Facebook verification failed' } );
		}

	} );
};


exports.twitterReverseAuthStepOne = function( req, res, next )
{
	var post =
	{
		url: 'https://api.twitter.com/oauth/request_token',
		oauth:
		{
			consumer_key: config.twitter.consumer_key,
			consumer_secret: config.twitter.consumer_secret
		},
		form:
		{
			x_auth_mode: 'reverse_auth'
		}
	};

	request.post( post, function( err, response, body )
	{
		if( err )
		{
			return res.send( 500, { message: err.message } );
		}

		if( body.indexOf( 'OAuth' ) !== 0 )
		{
			return res.send( 500, { message: 'Malformed response from Twitter' } );
		}

		res.send( 200, { x_reverse_auth_parameters: body } );
	} );
};
