import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for the user document
export interface IUser extends Document {
  username: string;
  password: string;
  company: mongoose.Types.ObjectId;
}

// Interface for the user model
interface IUserModel extends Model<IUser> {}

// Interface for the company document
export interface ICompany extends Document {
  name: string;
  description?: string;
  users: IUser[];
}

// Interface for the company model
interface ICompanyModel extends Model<ICompany> {}

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CompanySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      required: false,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the model with proper typing
const User = mongoose.model<IUser, IUserModel>("User", UserSchema);
export default User;

// Create and export the Company model
const Company = mongoose.model<ICompany, ICompanyModel>(
  "Company",
  CompanySchema
);
export { Company };
