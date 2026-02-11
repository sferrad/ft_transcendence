import React, { useState, useEffect } from 'react';
import Carousel from './Carousel';

const Home = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            <Carousel />
        </div>
    )
}

export default Home