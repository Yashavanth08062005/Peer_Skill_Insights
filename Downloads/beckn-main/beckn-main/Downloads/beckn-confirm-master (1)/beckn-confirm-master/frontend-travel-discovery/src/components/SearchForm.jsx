import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Users, Bus, Train } from "lucide-react";
import AutoCompleteInput from "./AutoCompleteInput";

const SearchForm = ({ prefill }) => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    origin: "",
    destination: "",
    cityCode: "",
    travelDate: "",
    checkInDate: "",
    checkOutDate: "",
    transportMode: "flight",
    passengers: 1,
    rooms: 1,
  });


  useEffect(() => {
    if (prefill.origin || prefill.destination) {
      setSearchData((prev) => ({ ...prev, ...prefill }));
    }
  }, [prefill]);

  const handleChange = (e) => {
    setSearchData({
      ...searchData,
      [e.target.name]: e.target.value,
    });
  };

  const handleModeChange = (mode) => {
    setSearchData({
      ...searchData,
      transportMode: mode,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams(searchData).toString();
    navigate(`/search?${queryParams}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl mx-auto -mt-20 relative z-10">
      {/* Transport Tabs */}
      <div className="flex flex-wrap gap-3 mb-6 border-b pb-4 justify-center">
        {[
          { label: "All", mode: "all" },
          { label: "Flights", mode: "flight" },
          { label: "Hotels", mode: "hotel" },
          { label: "Buses", mode: "bus" },
          { label: "Trains", mode: "train" },
          { label: "Experiences", mode: "experience" },
        ].map((tab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleModeChange(tab.mode)}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${searchData.transportMode === tab.mode
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit}>
        {searchData.transportMode === "all" || searchData.transportMode === "flight" || searchData.transportMode === "bus" || searchData.transportMode === "train" ? (
          /* Flight, Bus & Train Search Fields */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AutoCompleteInput
              label="From"
              name="origin"
              value={searchData.origin}
              onChange={handleChange}
              placeholder="Enter departure city"
            />

            <AutoCompleteInput
              label="To"
              name="destination"
              value={searchData.destination}
              onChange={handleChange}
              placeholder="Enter destination city"
            />

            {/* Travel Date */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="travelDate"
                  value={searchData.travelDate}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Passengers */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passengers
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  name="passengers"
                  value={searchData.passengers}
                  onChange={handleChange}
                  className="input-field pl-10"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "Passenger" : "Passengers"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : searchData.transportMode === "experience" ? (
          /* Experience Search Fields */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AutoCompleteInput
              label="City"
              name="cityCode"
              value={searchData.cityCode}
              onChange={handleChange}
              placeholder="Where to?"
            />

            {/* Date */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="travelDate"
                  value={searchData.travelDate}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Guests */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guests
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  name="passengers"
                  value={searchData.passengers}
                  onChange={handleChange}
                  className="input-field pl-10"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} Guest{num > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Hotel Search Fields */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AutoCompleteInput
              label="City"
              name="cityCode"
              value={searchData.cityCode}
              onChange={handleChange}
              placeholder="Enter city"
            />

            {/* Check-in Date */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-in
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="checkInDate"
                  value={searchData.checkInDate}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Check-out Date */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-out
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="checkOutDate"
                  value={searchData.checkOutDate}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Rooms & Guests */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rooms & Guests
              </label>
              <div className="flex space-x-2">
                <select
                  name="rooms"
                  value={searchData.rooms}
                  onChange={handleChange}
                  className="input-field flex-1"
                >
                  {[1, 2, 3, 4].map((num) => (
                    <option key={num} value={num}>
                      {num} Room{num > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <select
                  name="passengers"
                  value={searchData.passengers}
                  onChange={handleChange}
                  className="input-field flex-1"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      {num} Guest{num > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
        }

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all"
        >
          <Search className="h-5 w-5" />
          <span>
            Search {searchData.transportMode === "all" ? "All" :
              searchData.transportMode === "flight" ? "Flights" :
                searchData.transportMode === "hotel" ? "Hotels" :
                  searchData.transportMode === "bus" ? "Buses" :
                    searchData.transportMode === "train" ? "Trains" : "Experiences"}
          </span>
        </button>
      </form >
    </div >
  );
};

export default SearchForm;
