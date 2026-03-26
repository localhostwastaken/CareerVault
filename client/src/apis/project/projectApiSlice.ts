import { APISlice } from "../APISlice";

export const projectApiSlice = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: () => ({
        url: "/project",
        method: "GET",
      }),
      providesTags: ["Project"],
    }),
    getProjectById: builder.query({
      query: (id: string) => ({
        url: `/project/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Project", id }],
    }),
    createProject: builder.mutation({
      query: (project) => ({
        url: "/project",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Project"],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...project }) => ({
        url: `/project/${id}`,
        method: "PUT",
        body: project,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Project", id }, "Project"],
    }),
    deleteProject: builder.mutation({
      query: (id: string) => ({
        url: `/project/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Project"],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectApiSlice;