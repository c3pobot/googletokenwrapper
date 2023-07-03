'use strict'
const { v5: uuidv5 } = require('uuid')
const { OAuth2Client } = require("google-auth-library")
module.exports = class OauthClientWrapper{
  constructor(opt){
    this.client_id = opt.client_id
    this.client_secrect = opt.client_secrect
    this.redirect_uri = opt.redirect_uri
    this.cache_client = opt.cache_client || false
    this.genericClient = new OAuth2Client(
      this.client_id,
      this.client_secrect,
      this.redirect_uri
    )
    this.oAuthOptions = {
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/games_lite',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    }
    this.clientCache = {}
  }
  async getAccess(uid, refreshToken){
    try{
      let accessToken
      if(this.clientCache[uid]) accessToken = await this.testToken(this.clientCache[uid], uid)
      if(!accessToken && this.clientCache[uid]) delete this.clientCache[uid]
      if(!accessToken) accessToken = await this.newClient(uid, refreshToken)
      return accessToken
    }catch(e){
      //console.error(e)
    }
  }
  async getByUid(uid){
    try{
      if(this.clientCache[uid]) return await this.testToken(this.clientCache[uid], uid)
    }catch(e){
      console.error(e)
    }
  }
  async getClient(){
    return new OAuth2Client(
      this.client_id,
      this.client_secrect,
      this.redirect_uri
    )
  }
  async getTokens(code){
    try{
      return await this.genericClient.getToken(code)
    }catch(e){
      console.error(e)
    }
  }
  async getUid(tokens){
    try{
      const tokenInfo = await this.genericClient.getTokenInfo(tokens.access_token)
      return await uuidv5(tokenInfo.sub, uuidv5.URL)
    }catch(e){
      console.error(e)
    }
  }
  async getUrl(){
    try{
      return await this.genericClient.generateAuthUrl(this.oAuthOptions)
    }catch(e){
      console.error(e)
    }
  }
  async newClient(uid, refreshToken){
    try{
      const oauthClient = await this.getClient();
      oauthClient.setCredentials({
        refresh_token: refreshToken
      })
      return await this.testToken(oauthClient, uid)
    }catch(e){
      console.error(e)
    }
  }
  async testToken(oauthClient, uid){
    try{
      const newToken = await oauthClient.getAccessToken()
      if(this.cache_client && newToken && newToken.token &&  !this.clientCache[uid]) this.clientCache[uid] = oauthClient
      return newToken.token
    }catch(e){
      if(e?.response?.data){
        console.error('Google auth error: '+e.response.data.error_description)
        if(e.response.data.error == 'invalid_grant') return ({error: 1})
      }else{
        console.error(e.stack)
      }
    }
  }
}
