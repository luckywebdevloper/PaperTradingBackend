import mongoose from "mongoose";
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER",
    },
    email: {
      type: String,
      default: null,
    },
    fullName: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      default: null,
    },
    wallet: {
      type: Number,
      default: 1000000,
    },
    overallProfit: {
      type: String,
      default: null,
    },
    todayProfit: {
      type: String,
      default: null,
    },
    userPicture: {
      type: String,
      default: "https://www.w3schools.com/w3images/avatar5.png",
    },
    totalInvested: {
      type: Number,
      default: 0,
    },
    otp: {
      type: Number,
      default: null,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      default: "INR",
    },
    joinedOn: {
      type: Date,
      default: null,
    },
    profileStatus: {
      type: String,
      default: "Beginner",
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    phoneNumber: {
      type: Number,
      default: null,
    },
    isPhoneNumberVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("user", userSchema);
