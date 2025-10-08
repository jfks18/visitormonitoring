"use client";

import { useEffect } from "react";

export default function AddBootstrap()
{
    useEffect(()=>{
        // Load bootstrap JS only on the client
        import("bootstrap/dist/js/bootstrap.bundle")
            .catch((err) => {
                // don't crash the app if import fails in build/runtime
                console.error('Failed to load bootstrap JS', err);
            });
    },[])
    return <></>
}