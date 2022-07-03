export default (response: Endpoint_Response)=>{
    return {...response, headers: {...(response?.headers || {}), ...{'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'HEAD,GET,POST,PUT,DELETE,OPTIONS'}}};
}