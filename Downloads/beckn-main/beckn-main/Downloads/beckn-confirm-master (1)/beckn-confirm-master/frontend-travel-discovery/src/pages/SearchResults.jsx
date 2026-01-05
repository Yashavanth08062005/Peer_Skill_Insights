import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TravelCard from "../components/TravelCard";
import HotelCard from "../components/HotelCard";
import ExperienceCard from "../components/ExperienceCard";
import FilterSidebar from "../components/FilterSidebar";
import { searchTravelOptions } from "../services/api";
import { Loader2, AlertCircle } from "lucide-react";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    maxPrice: 50000,
    modes: [],
    sortBy: "price-low",
    departureTimes: [],
  });

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      const searchData = {
        origin: searchParams.get("origin"),
        destination: searchParams.get("destination"),
        travelDate: searchParams.get("travelDate"),
        transportMode: searchParams.get("transportMode"),
        passengers: searchParams.get("passengers"),
        cityCode: searchParams.get("cityCode"),
        checkInDate: searchParams.get("checkInDate"),
        checkOutDate: searchParams.get("checkOutDate"),
        rooms: searchParams.get("rooms"),
      };

      console.log('🔍 SearchResults - Search Data:', searchData);
      console.log('🔍 SearchResults - Transport Mode:', searchData.transportMode);

      try {
        const data = await searchTravelOptions(searchData);
        console.log('✅ SearchResults - Results received:', data);
        setResults(data);
      } catch (err) {
        setError(err.message || "Failed to fetch travel options");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const hasFlightParams =
      searchParams.get("origin") && searchParams.get("destination");
    const hasHotelParams =
      searchParams.get("cityCode") && searchParams.get("checkInDate");

    const hasExperienceParams =
      searchParams.get("cityCode") || (searchParams.get("origin") && searchParams.get("destination"));

    if (hasFlightParams || hasHotelParams || hasExperienceParams) {
      fetchResults();
    }
  }, [searchParams]);

  const filteredResults = results
    .filter((option) => {
      // Price filter
      if (option.price > filters.maxPrice) return false;

      // Mode filter
      if (filters.modes.length > 0 && !filters.modes.includes(option.travelMode)) {
        return false;
      }

      // Departure Time filter
      if (filters.departureTimes.length > 0 && option.timings?.departure) {
        const depHour = new Date(option.timings.departure).getHours();
        const isInSelectedTime = filters.departureTimes.some((t) => {
          if (t === "early-morning") return depHour >= 0 && depHour < 6;
          if (t === "morning") return depHour >= 6 && depHour < 12;
          if (t === "afternoon") return depHour >= 12 && depHour < 18;
          if (t === "evening") return depHour >= 18 && depHour < 24;
          return false;
        });
        if (!isInSelectedTime) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "departure":
          return (
            new Date(a.timings?.departure) - new Date(b.timings?.departure)
          );
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Search Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {searchParams.get("origin") && !searchParams.get("cityCode") && !searchParams.get("checkInDate") ? (
            <>
              <h1 className="text-2xl font-bold mb-2">
                {searchParams.get("origin")} → {searchParams.get("destination")}
              </h1>
              <p className="text-gray-600">
                {searchParams.get("travelDate")} •{" "}
                {searchParams.get("passengers")} Passenger(s)
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">
                {searchParams.get("cityCode") || searchParams.get("origin") || searchParams.get("destination")}
              </h1>
              <p className="text-gray-600">
                Check-in: {searchParams.get("checkInDate")} • Check-out: {searchParams.get("checkOutDate")} •{" "}
                {searchParams.get("rooms")} Room(s) • {searchParams.get("passengers")} Guest(s)
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar filters={filters} setFilters={setFilters} />
          </div>

          {/* Results Section */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">
                  Searching for the best travel options...
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-red-900 mb-1">
                    Error Loading Results
                  </h3>
                  <p className="text-red-700 mb-3">{error}</p>
                  <div className="text-sm text-red-600 bg-red-100 p-3 rounded mt-2">
                    <p className="font-semibold mb-1">Troubleshooting tips:</p>
                    <ul className="list-disc list-inside">
                      <li>Ensure the BAP service is running on port 8081</li>
                      <li>Check that the ONIX adapter is running</li>
                      <li>Verify network connectivity</li>
                      <li>Try refreshing the page</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Results Found</h3>
                <p className="text-gray-600">
                  Try adjusting your filters or search criteria
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-gray-600">
                    Showing{" "}
                    <span className="font-bold">
                      {filteredResults.length}
                    </span>{" "}
                    results
                  </p>
                </div>
                <div className="space-y-4">
                  {filteredResults.map((option, index) =>
                    option.travelMode === "hotel" ? (
                      <HotelCard
                        key={option.id || index}
                        option={option}
                        searchContext={{
                          cityCode: searchParams.get("cityCode"),
                          checkInDate: searchParams.get("checkInDate"),
                          checkOutDate: searchParams.get("checkOutDate"),
                          rooms: searchParams.get("rooms"),
                          passengers: searchParams.get("passengers")
                        }}
                      />
                    ) : option.travelMode === "experience" ? (
                      <ExperienceCard
                        key={option.id || index}
                        option={option}
                      />
                    ) : (
                      <TravelCard
                        key={option.id || index}
                        option={option}
                        searchContext={{
                          origin: searchParams.get("origin"),
                          destination: searchParams.get("destination"),
                          travelDate: searchParams.get("travelDate"),
                          passengers: searchParams.get("passengers")
                        }}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
