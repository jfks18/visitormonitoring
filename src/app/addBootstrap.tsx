"use client";

import { useEffect } from "react";

export default function AddBootstrap()
{
    useEffect(()=>{
        import( "/node_modules/bootstrap/dist/js/bootstrap.bundle.js")
    },[])
    return <></>
}