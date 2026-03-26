import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  data: [],
  pagination: {},
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setProjects: (state, action) => {
      state.data = action.payload;
    },
  },
});

export const { setProjects } = projectSlice.actions;
export default projectSlice.reducer;