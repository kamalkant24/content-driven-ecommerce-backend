import { jwtDecode } from "jwt-decode";
import usersChat from '../models/chatModel.js'

export const userChat = async(data)=>{
    
    try{
      const createingData=  await usersChat.create(data)
      console.log(createingData)
    }catch(err){
        console.log(err)

    }
};


