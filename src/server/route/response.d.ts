declare interface IRespond {
    locals:any;
    end(msg?: string): any;
    json(data: {ok: boolean, [index: string]: any}): any;
    sendFile(path: string): any;
}

declare interface IRequest {
    params:any;
}