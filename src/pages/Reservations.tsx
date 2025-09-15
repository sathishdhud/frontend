import React, { useState, useEffect } from "react";
import { Reservation, RoomType, Company, PlanType } from "../types/api";
import { reservationApi, masterDataApi } from "../services/api";
import Layout from "../components/Layout/Layout";

const Reservations: React.FC = () => {
  const [isCreating, setIsCreating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [activeTab, setActiveTab] = useState<"reservation" | "additional">(
    "reservation"
  );

  const [formData, setFormData] = useState({
    guestName: "",
    companyId: "",
    planId: "",
    roomTypeId: "",
    arrivalDate: "",
    departureDate: "",
    noOfDays: 1,
    noOfPersons: 1,
    noOfRooms: 1,
    mobileNumber: "",
    emailId: "",
    rate: 0,
    includingGst: "N" as "Y" | "N",
    remarks: "",
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (formData.arrivalDate && formData.departureDate) {
      const arrival = new Date(formData.arrivalDate);
      const departure = new Date(formData.departureDate);
      const diffTime = Math.abs(departure.getTime() - arrival.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormData((prev) => ({ ...prev, noOfDays: diffDays }));
    }
  }, [formData.arrivalDate, formData.departureDate]);

  const fetchMasterData = async () => {
    try {
      const [roomTypesRes, companiesRes, planTypesRes] = await Promise.all([
        masterDataApi.getRoomTypes(),
        masterDataApi.getCompanies(),
        masterDataApi.getPlanTypes(),
      ]);

      if (roomTypesRes.data.success) setRoomTypes(roomTypesRes.data.data);
      if (companiesRes.data.success) setCompanies(companiesRes.data.data);
      if (planTypesRes.data.success) setPlanTypes(planTypesRes.data.data);
    } catch (error) {
      console.error("Failed to fetch master data:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await reservationApi.createReservation(formData);

      if (response.data.success) {
        alert("Reservation created successfully!");
        setFormData({
          guestName: "",
          companyId: "",
          planId: "",
          roomTypeId: "",
          arrivalDate: "",
          departureDate: "",
          noOfDays: 1,
          noOfPersons: 1,
          noOfRooms: 1,
          mobileNumber: "",
          emailId: "",
          rate: 0,
          includingGst: "N",
          remarks: "",
        });
        setActiveTab("reservation");
      }
    } catch (error: any) {
      alert(
        `Error: ${
          error.response?.data?.message || "Failed to create reservation"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      guestName: "",
      companyId: "",
      planId: "",
      roomTypeId: "",
      arrivalDate: "",
      departureDate: "",
      noOfDays: 1,
      noOfPersons: 1,
      noOfRooms: 1,
      mobileNumber: "",
      emailId: "",
      rate: 0,
      includingGst: "N",
      remarks: "",
    });
    setActiveTab("reservation");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Reservation Management
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsCreating(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isCreating
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Create Reservation
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !isCreating
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Manage Reservations
            </button>
          </div>
        </div>

        {isCreating ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Reservation
              </h2>
              <p className="text-gray-600 mt-1">
                Fill in the details below to create a new reservation.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("reservation")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "reservation"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Reservation Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("additional")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "additional"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Additional Details
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {activeTab === "reservation" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Guest Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      required
                      value={formData.guestName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter guest's full name"
                    />
                  </div>

                  {/* Arrival Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arrival Date *
                    </label>
                    <input
                      type="date"
                      name="arrivalDate"
                      required
                      value={formData.arrivalDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Departure Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departure Date *
                    </label>
                    <input
                      type="date"
                      name="departureDate"
                      required
                      value={formData.departureDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Number of Persons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Persons *
                    </label>
                    <input
                      type="number"
                      name="noOfPersons"
                      required
                      min="1"
                      value={formData.noOfPersons}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Number of Rooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Rooms *
                    </label>
                    <input
                      type="number"
                      name="noOfRooms"
                      required
                      min="1"
                      value={formData.noOfRooms}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      required
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., +1234567890"
                    />
                  </div>

                  {/* Email ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email ID
                    </label>
                    <input
                      type="email"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., guest@example.com"
                    />
                  </div>

                  {/* Rate per night */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate (per night)
                    </label>
                    <input
                      type="number"
                      name="rate"
                      min="0"
                      step="0.01"
                      value={formData.rate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 150.00"
                    />
                  </div>

                  {/* GST */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Included
                    </label>
                    <select
                      name="includingGst"
                      value={formData.includingGst}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="N">No</option>
                      <option value="Y">Yes</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "additional" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <select
                      name="companyId"
                      value={formData.companyId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option
                          key={company.companyId}
                          value={company.companyId}
                        >
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Plan Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Type
                    </label>
                    <select
                      name="planId"
                      value={formData.planId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Plan</option>
                      {planTypes.map((plan) => (
                        <option key={plan.planId} value={plan.planId}>
                          {plan.planName} ({plan.discountPercentage}% discount)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Type
                    </label>
                    <select
                      name="roomTypeId"
                      value={formData.roomTypeId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Room Type</option>
                      {roomTypes.map((type) => (
                        <option key={type.typeId} value={type.typeId}>
                          {type.typeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requests or notes"
                    />
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Reservation"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Manage Reservations
            </h2>
            <p className="text-gray-500">
              Reservation management features will be implemented here.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reservations;
