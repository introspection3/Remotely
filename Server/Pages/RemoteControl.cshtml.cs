using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Remotely.Server.Auth;
using Remotely.Server.Services;
using Remotely.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
namespace Remotely.Server.Pages
{
  //  [ServiceFilter(typeof(RemoteControlFilterAttribute))]
    [AllowAnonymous]
    public class RemoteControlModel : PageModel
    {
        private readonly IDataService _dataService;
        public RemoteControlModel(IDataService dataService)
        {
            _dataService = dataService;
        }

        public RemotelyUser RemotelyUser { get; private set; }
        public void OnGet()
        {
            if (User.Identity.IsAuthenticated)
            {
                RemotelyUser = _dataService.GetUserByNameWithOrg(base.User.Identity.Name);
            }
        }
    }
}
